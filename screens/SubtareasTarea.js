import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, Alert, Modal,
  TouchableOpacity, StatusBar, ActivityIndicator, ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { calcularAvanceSubtareas, calcularAvanceTareas } from '../utils/calcularPorcentaje';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';

const SubtareasTarea = ({ route }) => {
  const { tareaId, userId, userEmail, proyectoId, userRole } = route.params;
  const [subtareas, setSubtareas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [subtareaAEliminar, setSubtareaAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fechaEntregaTarea, setFechaEntregaTarea] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    obtenerUsuarioActual();
    obtenerSubtareas();
    obtenerFechaEntregaTarea();
  }, []);

  const obtenerUsuarioActual = () => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
    }
  };

  const obtenerSubtareas = async () => {
    try {
      const q = query(collection(db, 'subtareas'), where('tareaId', '==', tareaId));
      const querySnapshot = await getDocs(q);
      const datos = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          completado: 'completado' in data ? data.completado : false,
          fechaEntrega: data.fechaEntrega && typeof data.fechaEntrega.toDate === 'function'
            ? data.fechaEntrega.toDate()
            : null
        };
      });
      setSubtareas(datos);
    } catch (error) {
      console.error('Error al obtener subtareas:', error);
      Alert.alert('Error', 'No se pudieron cargar las subtareas');
    } finally {
      setLoading(false);
    }
  };

  const obtenerFechaEntregaTarea = async () => {
    try {
      const tareaRef = doc(db, 'tareas', tareaId);
      const snap = await getDoc(tareaRef);
      if (snap.exists()) {
        const data = snap.data();
        const fecha = data.fechaEntrega && typeof data.fechaEntrega.toDate === 'function'
          ? data.fechaEntrega.toDate()
          : data.fechaEntrega;
        setFechaEntregaTarea(fecha);
      }
    } catch (err) {
      console.error('Error al obtener fecha de la tarea:', err);
    }
  };

  const actualizarAvance = async () => {
    try {
      const avanceTarea = await calcularAvanceSubtareas(tareaId);
      const tareaRef = doc(db, 'tareas', tareaId);
      await updateDoc(tareaRef, { avance: avanceTarea });

      const avanceProyecto = await calcularAvanceTareas(proyectoId);
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      await updateDoc(proyectoRef, { avance: avanceProyecto });
    } catch (error) {
      console.error('Error al actualizar porcentaje:', error);
    }
  };

  const registrarEnHistorial = async (accion, subtareaId, datosAdicionales = {}) => {
    try {
      await addDoc(collection(db, 'historial'), {
        accion,
        entidadId: subtareaId,
        proyectoId,
        tareaId,
        usuario: currentUser?.email || 'usuario@desconocido.com',
        usuarioUsername: currentUser?.email?.split('@')[0] || 'usuario',
        fechaCambio: Timestamp.now(),
        ...datosAdicionales
      });
    } catch (error) {
      console.error('Error al registrar en historial:', error);
    }
  };

  const crearSubtarea = async () => {
    if (!nombre) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    if (fechaEntregaTarea && fechaEntrega > new Date(fechaEntregaTarea)) {
      Alert.alert('Error', 'La fecha de la subtarea no puede superar la de la tarea.');
      return;
    }

    try {
      setLoading(true);
      const subtareaRef = await addDoc(collection(db, 'subtareas'), {
        nombre,
        tareaId,
        completado: false,
        fechaEntrega: fechaEntrega,
        fechaCreacion: Timestamp.now(),
        creadoPor: currentUser?.email || 'usuario@desconocido.com'
      });
      
      await registrarEnHistorial('CREAR_SUBTAREA', subtareaRef.id, {
        nombreSubtarea: nombre,
        estadoNuevo: 'Pendiente'
      });
      
      setNombre('');
      await obtenerSubtareas();
      await actualizarAvance();
    } catch (error) {
      Alert.alert('Error', 'Error al crear la subtarea');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletado = async (subtareaId, completadoActual, nombreSubtarea) => {
    try {
      setLoading(true);
      const subtareaRef = doc(db, 'subtareas', subtareaId);
      const nuevoEstado = !completadoActual;
      await updateDoc(subtareaRef, { completado: nuevoEstado });
      
      await registrarEnHistorial(
        nuevoEstado ? 'COMPLETAR_SUBTAREA' : 'REABRIR_SUBTAREA',
        subtareaId,
        {
          nombreSubtarea,
          estadoNuevo: nuevoEstado ? 'Completada' : 'Pendiente'
        }
      );
      
      await obtenerSubtareas();
      await actualizarAvance();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado de la subtarea');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (userRole !== 'gerente') {
      Alert.alert("Error", "Solo los gerentes pueden eliminar subtareas.");
      return;
    }

    if (!confirmPassword) {
      Alert.alert("Error", "Por favor ingresa tu contraseña.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, userEmail, confirmPassword);
      
      // Obtener datos de la subtarea antes de eliminarla para el historial
      const subtareaRef = doc(db, 'subtareas', subtareaAEliminar);
      const subtareaSnap = await getDoc(subtareaRef);
      const subtareaData = subtareaSnap.data();
      
      await deleteDoc(subtareaRef);
      
      await registrarEnHistorial('ELIMINAR_SUBTAREA', subtareaAEliminar, {
        nombreSubtarea: subtareaData?.nombre || 'Subtarea sin nombre',
        estadoAnterior: subtareaData?.completado ? 'Completada' : 'Pendiente'
      });
      
      Alert.alert('Éxito', 'Subtarea eliminada correctamente');
      setModalVisible(false);
      setConfirmPassword('');
      await obtenerSubtareas();
      await actualizarAvance();
    } catch (error) {
      Alert.alert('Error', 'Contraseña incorrecta o fallo de conexión');
      setConfirmPassword('');
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3a7bd5" />
      <LinearGradient
        colors={['#3a7bd5', '#00d2ff']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Subtareas</Text>
          <Text style={styles.subtitle}>
            {subtareas.length} {subtareas.length === 1 ? 'subtarea' : 'subtareas'} registradas
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Nueva Subtarea</Text>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="title" size={20} color="#3a7bd5" style={styles.inputIcon} />
            <TextInput
              placeholder="Nombre de la subtarea"
              placeholderTextColor="#90A4AE"
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="date-range" size={20} color="#3a7bd5" style={styles.inputIcon} />
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {fechaEntrega ? formatFecha(fechaEntrega) : 'Seleccionar fecha de entrega'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              value={fechaEntrega}
              mode="date"
              display="default"
              minimumDate={new Date(Date.now() + 86400000)}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setFechaEntrega(selectedDate);
              }}
            />
          )}
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={crearSubtarea}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <AntDesign name="pluscircleo" size={18} color="#fff" />
                <Text style={styles.buttonText}>Crear Subtarea</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {loading && subtareas.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3a7bd5" />
            <Text style={styles.loadingText}>Cargando subtareas...</Text>
          </View>
        ) : subtareas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="list" size={50} color="#cfd8dc" />
            <Text style={styles.emptyText}>No hay subtareas registradas</Text>
            <Text style={styles.emptySubtext}>Crea tu primera subtarea</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Subtareas registradas</Text>
            {subtareas.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity 
                    onPress={() => toggleCompletado(item.id, item.completado, item.nombre)}
                    disabled={userRole !== 'miembro'}
                  >
                    <MaterialIcons 
                      name={item.completado ? "check-box" : "check-box-outline-blank"} 
                      size={24} 
                      color={item.completado ? "#4CAF50" : "#757575"} 
                    />
                  </TouchableOpacity>
                  <Text style={[styles.cardTitle, item.completado && styles.completedText]}>{item.nombre}</Text>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <View style={[styles.statusBadge, item.completado ? styles.completedBadge : styles.pendingBadge]}>
                      <Text style={[styles.statusText, item.completado ? styles.completedStatus : styles.pendingStatus]}>
                        {item.completado ? 'Completada' : 'Pendiente'}
                      </Text>
                    </View>
                    
                    {item.fechaEntrega && (
                      <View style={styles.dateInfo}>
                        <Feather name="calendar" size={16} color="#757575" />
                        <Text style={styles.dateText}>
                          {formatFecha(item.fechaEntrega)}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.creatorInfo}>
                    <Feather name="user" size={14} color="#90A4AE" />
                    <Text style={styles.creatorText}>{item.creadoPor || 'Usuario desconocido'}</Text>
                  </View>
                </View>
                
                {userRole === 'gerente' && (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        setSubtareaAEliminar(item.id);
                        setModalVisible(true);
                      }}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#F44336" />
                      <Text style={styles.deleteButtonText}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de eliminación */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="warning" size={40} color="#FFA000" />
            </View>
            <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro que deseas eliminar esta subtarea? Esta acción no se puede deshacer.
            </Text>
            
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={20} color="#3a7bd5" style={styles.inputIcon} />
              <TextInput
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#90A4AE"
                secureTextEntry
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setModalVisible(false);
                  setConfirmPassword('');
                }}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.dangerButton]}
                onPress={confirmarEliminacion}
                disabled={!confirmPassword || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Estilos (igual que en la versión anterior)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3a7bd5',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  inputIcon: {
    padding: 12,
    backgroundColor: '#f5f7fa',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#263238',
  },
  dateInput: {
    flex: 1,
    padding: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#263238',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#3a7bd5',
  },
  secondaryButton: {
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  secondaryButtonText: {
    color: '#546E7A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#3a7bd5',
    fontSize: 16,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyText: {
    marginTop: 16,
    color: '#90A4AE',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#90A4AE',
    fontSize: 14,
    marginTop: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3a7bd5',
    marginBottom: 12,
    marginLeft: 8,
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
    fontSize: 16,
    color: '#263238',
    marginLeft: 10,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#90A4AE',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  completedStatus: {
    color: '#4CAF50',
  },
  pendingStatus: {
    color: '#FFA000',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  creatorText: {
    color: '#90A4AE',
    fontSize: 12,
    marginLeft: 5,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
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
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3a7bd5',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#263238',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
});

export default SubtareasTarea;
