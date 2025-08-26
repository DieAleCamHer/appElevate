import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Modal, TextInput, Alert, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator
} from 'react-native';
import {
  collection, query, where, getDocs, updateDoc, doc, addDoc, Timestamp, getDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ESTADOS, listaEstados } from '../utils/estados';
import { calcularAvanceSubtareas, calcularAvanceTareas } from '../utils/calcularPorcentaje';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const SubtareasMiembro = ({ route, navigation }) => {
  const { tareaId, userId, proyectoId } = route.params;
  const [subtareas, setSubtareas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [comentario, setComentario] = useState('');
  const [subtareaSeleccionada, setSubtareaSeleccionada] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const obtenerSubtareas = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'subtareas'), where('tareaId', '==', tareaId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => {
        const datos = d.data();
        return {
          id: d.id,
          ...datos,
          completado: 'completado' in datos ? datos.completado : false,
          fechaEntrega: datos.fechaEntrega && typeof datos.fechaEntrega.toDate === 'function'
            ? datos.fechaEntrega.toDate()
            : null
        };
      });
      setSubtareas(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las subtareas');
    } finally {
      setLoading(false);
    }
  };

  const obtenerUsuario = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('__name__', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) setUserInfo(snap.docs[0].data());
    } catch {
      // no-op
    }
  };

  const cambiarEstado = async () => {
    if (!comentario || !nuevoEstado || !subtareaSeleccionada) {
      Alert.alert('Error', 'Debes ingresar un comentario y seleccionar un estado');
      return;
    }
    try {
      const subtareaRef = doc(db, 'subtareas', subtareaSeleccionada.id);
      const subtareaSnap = await getDoc(subtareaRef);
      const subtareaData = subtareaSnap.data();

      if (subtareaData.estado === nuevoEstado) {
        Alert.alert('Error', 'El estado seleccionado es igual al actual.');
        return;
      }

      let estadoFinal = nuevoEstado;
      if (nuevoEstado === ESTADOS.FINALIZADO) {
        const ahora = new Date();
        const fechaEntrega =
          subtareaData?.fechaEntrega && typeof subtareaData.fechaEntrega.toDate === 'function'
            ? subtareaData.fechaEntrega.toDate()
            : null;
        if (fechaEntrega && ahora > fechaEntrega) {
          estadoFinal = ESTADOS.ENTREGA_TARDIA; 
        }
      }

      await updateDoc(subtareaRef, {
        estado: estadoFinal,
        completado: estadoFinal === ESTADOS.FINALIZADO || estadoFinal === ESTADOS.ENTREGA_TARDIA
      });

      await addDoc(collection(db, 'historial'), {
        usuarioId: userId,
        usuarioNombre: userInfo?.nombre || '',
        usuarioUsername: userInfo?.username || '',
        proyectoId,
        tareaId,
        subtareaId: subtareaSeleccionada.id,
        estadoNuevo: estadoFinal,
        comentario,
        fechaCambio: Timestamp.now()
      });

      await calcularAvanceSubtareas(tareaId);
      await calcularAvanceTareas(proyectoId);

      setModalVisible(false);
      setComentario('');
      setNuevoEstado('');
      setSubtareaSeleccionada(null);
      obtenerSubtareas();

      Alert.alert('Estado actualizado', `Has cambiado el estado a "${estadoFinal}"`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case ESTADOS.PENDIENTE: return '#FFA000';
      case ESTADOS.EN_PROGRESO: return '#2196F3';
      case ESTADOS.FINALIZADO: return '#4CAF50';
      case ESTADOS.ENTREGA_TARDIA: return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case ESTADOS.PENDIENTE: return 'pending-actions';
      case ESTADOS.EN_PROGRESO: return 'hourglass-full';
      case ESTADOS.FINALIZADO: return 'check-circle';
      case ESTADOS.ENTREGA_TARDIA: return 'warning';
      default: return 'help-outline';
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha definida';
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  useEffect(() => {
    obtenerSubtareas();
    obtenerUsuario();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      <LinearGradient
        colors={['#3A7BD5', '#00D2FF']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Subtareas</Text>

        {/* Botón actualizar */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={obtenerSubtareas}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3A7BD5" />
          <Text style={styles.loadingText}>Cargando subtareas...</Text>
        </View>
      ) : (
        <FlatList
          data={subtareas}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment" size={60} color="#CFD8DC" />
              <Text style={styles.emptyTitle}>No hay subtareas</Text>
              <Text style={styles.emptySubtitle}>No tienes subtareas asignadas en esta tarea</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.taskCard}
              onPress={() => {
                setSubtareaSeleccionada(item);
                setModalVisible(true);
              }}
            >
              <View style={styles.taskHeader}>
                <View style={styles.iconContainer}>
                  <MaterialIcons
                    name={getEstadoIcon(item.estado)}
                    size={20}
                    color={getEstadoColor(item.estado)}
                  />
                </View>
                <Text style={styles.taskName} numberOfLines={1}>
                  {item.nombre || 'Subtarea sin nombre'}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color="#3A7BD5" />
              </View>

              <Text style={styles.taskDescription} numberOfLines={2}>
                {item.descripcion || 'Sin descripción disponible'}
              </Text>

              {item.fechaEntrega && (
                <View style={styles.dateContainer}>
                  <MaterialIcons name="event" size={16} color="#7F8C8D" />
                  <Text style={styles.dateText}>{formatFecha(item.fechaEntrega)}</Text>
                </View>
              )}

              <View style={styles.taskFooter}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getEstadoColor(item.estado) + '20' }
                  ]}
                >
                  <Text style={[styles.statusText, { color: getEstadoColor(item.estado) }]}>
                    {item.estado || 'Pendiente'}
                  </Text>
                </View>
                <Text style={styles.changeStatusText}>Cambiar estado</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal cambiar estado */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Estado</Text>
            <Text style={styles.modalSubtitle}>{subtareaSeleccionada?.nombre}</Text>

            {/* Oculta 'ENTREGA_TARDIA' del selector */}
            <ScrollView style={styles.estadosContainer}>
              {listaEstados
                .filter(e => e !== ESTADOS.ENTREGA_TARDIA)
                .map((estado) => (
                  <TouchableOpacity
                    key={estado}
                    onPress={() => setNuevoEstado(estado)}
                    style={[
                      styles.estadoBtn,
                      nuevoEstado === estado && {
                        backgroundColor: getEstadoColor(estado) + '20',
                        borderColor: getEstadoColor(estado)
                      }
                    ]}
                  >
                    <MaterialIcons
                      name={getEstadoIcon(estado)}
                      size={20}
                      color={getEstadoColor(estado)}
                    />
                    <Text style={styles.estadoBtnTexto}>{estado}</Text>
                    {nuevoEstado === estado && (
                      <MaterialIcons name="check" size={20} color={getEstadoColor(estado)} />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Comentario (requerido)</Text>
            <TextInput
              placeholder="Explica el motivo del cambio de estado..."
              placeholderTextColor="#90A4AE"
              style={styles.input}
              value={comentario}
              onChangeText={setComentario}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              blurOnSubmit
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setComentario('');
                  setNuevoEstado('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!nuevoEstado || !comentario) && styles.saveButtonDisabled
                ]}
                onPress={cambiarEstado}
                disabled={!nuevoEstado || !comentario}
              >
                <Text style={styles.saveButtonText}>Confirmar Cambio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    color: '#3A7BD5',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#90A4AE',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#B0BEC5',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(58, 123, 213, 0.04)',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: 8,
    padding: 6,
    marginRight: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  taskDescription: {
    fontSize: 13,
    color: '#5A6B7C',
    lineHeight: 18,
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(121, 144, 156, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 12,
    color: '#607D8B',
    marginLeft: 5,
    fontWeight: '500',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 123, 213, 0.06)',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  changeStatusText: {
    fontSize: 12,
    color: '#3A7BD5',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 14,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  estadosContainer: {
    maxHeight: 180,
    marginBottom: 16,
  },
  estadoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: '#ECEFF1',
  },
  estadoBtnTexto: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 10,
    color: '#263238',
    flex: 1,
  },
  inputLabel: {
    color: '#546E7A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#E3E9F1',
    borderRadius: 10,
    padding: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 14,
    color: '#263238',
    backgroundColor: '#F9FBFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F4F8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#607D8B',
    fontWeight: '700',
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3A7BD5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
export default SubtareasMiembro;