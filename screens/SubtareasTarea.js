import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, Alert, Modal,
  TouchableOpacity, ImageBackground, StatusBar, ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, Timestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { calcularAvanceSubtareas, calcularAvanceTareas } from '../utils/calcularPorcentaje';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Feather } from '@expo/vector-icons';

const SubtareasTarea = ({ route }) => {
  const { tareaId, userId, userEmail, proyectoId } = route.params;
  const [subtareas, setSubtareas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [subtareaAEliminar, setSubtareaAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fechaEntregaTarea, setFechaEntregaTarea] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerSubtareas();
    obtenerFechaEntregaTarea();
  }, []);

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
      await addDoc(collection(db, 'subtareas'), {
        nombre,
        tareaId,
        completado: false,
        fechaEntrega: fechaEntrega,
        fechaCreacion: Timestamp.now()
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

  const confirmarEliminacion = async () => {
    const email = userEmail;

    if (!email) {
      Alert.alert("Error", "No se pudo obtener el correo del usuario autenticado.");
      return;
    }

    if (!confirmPassword) {
      Alert.alert("Error", "Por favor ingresa tu contraseña.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, confirmPassword);
      await deleteDoc(doc(db, 'subtareas', subtareaAEliminar));
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
          <Text style={styles.title}>Gestión de Subtareas</Text>
          <Text style={styles.subtitle}>
            {subtareas.length} {subtareas.length === 1 ? 'subtarea' : 'subtareas'} registradas
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Crear Nueva Subtarea</Text>
          
          <TextInput
            placeholder="Nombre de la subtarea"
            placeholderTextColor="#90A4AE"
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
          />
          
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="date-range" size={20} color="#0D47A1" />
            <Text style={styles.dateButtonText}>
              {fechaEntrega ? formatFecha(fechaEntrega) : 'Seleccionar fecha de entrega'}
            </Text>
          </TouchableOpacity>
          
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
            style={styles.createButton}
            onPress={crearSubtarea}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creando...' : 'Crear Subtarea'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D47A1" />
            <Text style={styles.loadingText}>Cargando subtareas...</Text>
          </View>
        ) : subtareas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="playlist-add" size={50} color="#90A4AE" />
            <Text style={styles.emptyText}>No hay subtareas registradas</Text>
            <Text style={styles.emptySubtext}>Crea tu primera subtarea</Text>
          </View>
        ) : (
          <FlatList
            data={subtareas}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <MaterialIcons 
                    name={item?.completado ? "check-box" : "check-box-outline-blank"} 
                    size={24} 
                    color={item?.completado ? "#4CAF50" : "#757575"} 
                  />
                  <Text style={styles.cardTitle}>{item.nombre}</Text>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.statusBadge(item?.completado)}>
                    <Text style={[styles.statusText, { color: item?.completado ? '#4CAF50' : '#FFA000' }]}>
                      {item?.completado ? 'Completada' : 'Pendiente'}
                    </Text>
                  </View>
                  
                  {item.fechaEntrega && (
                    <View style={styles.dateContainer}>
                      <Feather name="calendar" size={16} color="#757575" />
                      <Text style={styles.dateText}>
                        Entrega: {formatFecha(item.fechaEntrega)}
                      </Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => {
                    setSubtareaAEliminar(item.id);
                    setModalVisible(true);
                  }}
                >
                  <MaterialIcons name="delete" size={20} color="#F44336" />
                  <Text style={styles.deleteButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {/* Modal de eliminación */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <MaterialIcons name="warning" size={40} color="#FFA000" style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
              <Text style={styles.modalText}>
                ¿Estás seguro que deseas eliminar esta subtarea? Esta acción no se puede deshacer.
              </Text>
              <Text style={styles.inputLabel}>Confirma tu contraseña</Text>
              <TextInput
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#90A4AE"
                secureTextEntry
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={confirmarEliminacion}
                  disabled={!confirmPassword || loading}
                >
                  <Text style={styles.confirmButtonText}>
                    {loading ? 'Eliminando...' : 'Confirmar'}
                  </Text>
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
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    color: '#0D47A1',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#263238',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#263238',
  },
  createButton: {
    backgroundColor: '#0D47A1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#90A4AE',
    fontSize: 14,
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
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
  statusBadge: (completado) => ({
    backgroundColor: completado ? '#E8F5E9' : '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  }),
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    // 🔴 Eliminado: color dinámico no se debe colocar aquí
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    marginTop: 10,
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
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#546E7A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    fontSize: 16,
    color: '#263238',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
    padding: 14,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#546E7A',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 14,
    flex: 1,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SubtareasTarea;
