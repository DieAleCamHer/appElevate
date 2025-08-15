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
import { MaterialIcons, AntDesign } from '@expo/vector-icons';

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
      const q = query(collection(db, 'subtareas'), where('tareaId', '==', tareaId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const datos = doc.data();
        return {
          id: doc.id,
          ...datos,
          completado: 'completado' in datos ? datos.completado : false,
          fechaEntrega: datos.fechaEntrega && typeof datos.fechaEntrega.toDate === 'function'
            ? datos.fechaEntrega.toDate()
            : null
        };
      });
      setSubtareas(data);
    } catch (error) {
      console.error('Error al obtener subtareas:', error);
      Alert.alert('Error', 'No se pudieron cargar las subtareas');
    } finally {
      setLoading(false);
    }
  };

  const obtenerUsuario = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('__name__', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setUserInfo(snap.docs[0].data());
      }
    } catch (error) {
      console.error('Error al obtener usuario:', error);
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
        const hoy = new Date();
        const fechaEntrega = subtareaData?.fechaEntrega && typeof subtareaData.fechaEntrega.toDate === 'function'
          ? subtareaData.fechaEntrega.toDate()
          : null;

        if (fechaEntrega && hoy > fechaEntrega) {
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
      
      // Mostrar feedback visual de éxito
      Alert.alert(
        '✅ Estado actualizado',
        `Has cambiado el estado a "${estadoFinal}"`,
        [{ text: 'OK', onPress: () => {} }],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case ESTADOS.PENDIENTE: return '#FFA000';
      case ESTADOS.EN_PROGRESO: return '#2196F3';
      case ESTADOS.FINALIZADO: return '#4CAF50';
      case ESTADOS.ENTREGA_TARDIA: return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getEstadoIcon = (estado) => {
    switch(estado) {
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
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    obtenerSubtareas();
    obtenerUsuario();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      
      {/* Header */}
      <LinearGradient
        colors={['#3A7BD5', '#00D2FF']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subtareas</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* Contenido */}
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
                  <Text style={styles.dateText}>
                    {formatFecha(item.fechaEntrega)}
                  </Text>
                </View>
              )}
              
              <View style={styles.taskFooter}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getEstadoColor(item.estado) + '20' }
                ]}>
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

      {/* Modal para cambiar estado */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Estado</Text>
            <Text style={styles.modalSubtitle}>{subtareaSeleccionada?.nombre}</Text>
            
            <ScrollView style={styles.estadosContainer}>
              {listaEstados.map((estado) => (
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
    backgroundColor: '#F5F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#3A7BD5',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#90A4AE',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#B0BEC5',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: 8,
    padding: 6,
    marginRight: 12,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#78909C',
    marginLeft: 6,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 123, 213, 0.1)',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeStatusText: {
    fontSize: 12,
    color: '#3A7BD5',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 20,
  },
  estadosContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  estadoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
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
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 14,
    color: '#263238',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
    padding: 14,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#546E7A',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3A7BD5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SubtareasMiembro;