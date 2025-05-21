import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Modal, TextInput, Alert, TouchableOpacity, 
  ScrollView, StatusBar, ActivityIndicator, ImageBackground
} from 'react-native';
import {
  collection, query, where, getDocs, updateDoc, doc, addDoc, Timestamp, getDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ESTADOS, listaEstados } from '../utils/estados';
import { calcularAvanceSubtareas, calcularAvanceTareas } from '../utils/calcularPorcentaje';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';

const SubtareasMiembro = ({ route }) => {
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
      Alert.alert('Éxito', 'Estado actualizado correctamente');
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
    <ImageBackground 
      source={require('../assets/logo.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      <View style={styles.container}>
        <LinearGradient
          colors={['#0D47A1', '#1976D2']}
          style={styles.header}
        >
          <Text style={styles.title}>Subtareas Asignadas</Text>
          <Text style={styles.subtitle}>
            {subtareas.length} {subtareas.length === 1 ? 'subtarea' : 'subtareas'} en total
          </Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D47A1" />
            <Text style={styles.loadingText}>Cargando subtareas...</Text>
          </View>
        ) : subtareas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={50} color="#90A4AE" />
            <Text style={styles.emptyText}>No tienes subtareas asignadas</Text>
          </View>
        ) : (
          <FlatList
            data={subtareas}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.card}
                onPress={() => {
                  setSubtareaSeleccionada(item);
                  setModalVisible(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <MaterialIcons 
                    name="assignment" 
                    size={24} 
                    color={getEstadoColor(item.estado)} 
                  />
                  <Text style={styles.cardTitle}>{item.nombre}</Text>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.statusBadge(item.estado)}>
                    <Text style={styles.statusText}>{item.estado || 'pendiente'}</Text>
                  </View>
                  
                  {item.descripcion && (
                    <Text style={styles.description}>{item.descripcion}</Text>
                  )}
                  
                  {item.fechaEntrega && (
                    <View style={styles.dateContainer}>
                      <MaterialIcons name="schedule" size={16} color="#757575" />
                      <Text style={styles.dateText}>
                        Entrega: {formatFecha(item.fechaEntrega)}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.actionText}>Toca para cambiar estado</Text>
                  <AntDesign name="right" size={16} color="#0D47A1" />
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Modal */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Actualizar Estado</Text>
              <Text style={styles.modalSubtitle}>{subtareaSeleccionada?.nombre}</Text>
              
              <ScrollView style={styles.estadosContainer}>
                {listaEstados.map((estado) => (
                  <TouchableOpacity
                    key={estado}
                    onPress={() => setNuevoEstado(estado)}
                    style={[
                      styles.estadoBtn, 
                      nuevoEstado === estado && styles.estadoBtnSeleccionado(estado)
                    ]}
                  >
                    <MaterialIcons 
                      name={
                        estado === ESTADOS.PENDIENTE ? 'pending-actions' :
                        estado === ESTADOS.EN_PROGRESO ? 'hourglass-full' :
                        estado === ESTADOS.FINALIZADO ? 'check-circle' :
                        'warning'
                      } 
                      size={20} 
                      color={getEstadoColor(estado)} 
                    />
                    <Text style={styles.estadoBtnTexto}>{estado}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Text style={styles.inputLabel}>Comentario (requerido)</Text>
              <TextInput
                placeholder="Explica el cambio de estado..."
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
                  style={styles.saveButton}
                  onPress={cambiarEstado}
                  disabled={!nuevoEstado || !comentario}
                >
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    opacity: 0.9,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#0D47A1',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#90A4AE',
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: '#263238',
    marginLeft: 10,
    flex: 1,
  },
  cardBody: {
    marginBottom: 12,
  },
  statusBadge: (estado) => ({
    backgroundColor: estado === ESTADOS.PENDIENTE ? '#FFF3E0' :
                    estado === ESTADOS.EN_PROGRESO ? '#E3F2FD' :
                    estado === ESTADOS.FINALIZADO ? '#E8F5E9' :
                    '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  }),
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#263238',
  },
  description: {
    color: '#546E7A',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  dateText: {
    color: '#757575',
    fontSize: 12,
    marginLeft: 5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    paddingTop: 12,
  },
  actionText: {
    color: '#0D47A1',
    fontSize: 14,
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
    color: '#0D47A1',
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
  estadoBtnSeleccionado: (estado) => ({
    backgroundColor: estado === ESTADOS.PENDIENTE ? '#FFF3E0' :
                    estado === ESTADOS.EN_PROGRESO ? '#E3F2FD' :
                    estado === ESTADOS.FINALIZADO ? '#E8F5E9' :
                    '#FFEBEE',
    borderColor: estado === ESTADOS.PENDIENTE ? '#FFA000' :
                 estado === ESTADOS.EN_PROGRESO ? '#2196F3' :
                 estado === ESTADOS.FINALIZADO ? '#4CAF50' :
                 '#F44336',
  }),
  estadoBtnTexto: {
    fontWeight: '600',
    fontSize: 16,
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
    backgroundColor: '#0D47A1',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    opacity: 1,
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