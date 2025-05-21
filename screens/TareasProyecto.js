import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { calcularAvanceTareas } from '../utils/calcularPorcentaje';

const TareasProyecto = ({ route, navigation }) => {
  const { proyectoId, userId } = route.params;
  const [tareas, setTareas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntregaProyecto, setFechaEntregaProyecto] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [tareaAEliminar, setTareaAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [miembrosDisponibles, setMiembrosDisponibles] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);

  const [modalVerMiembrosVisible, setModalVerMiembrosVisible] = useState(false);
  const [miembrosAsignados, setMiembrosAsignados] = useState([]);
  const [modalEliminarMiembro, setModalEliminarMiembro] = useState(false);
  const [miembroAEliminar, setMiembroAEliminar] = useState(null);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      })
    ]).start();

    obtenerTareas();
    obtenerFechaEntregaProyecto();
  }, []);

  const obtenerFechaEntregaProyecto = async () => {
    try {
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      const snap = await getDoc(proyectoRef);
      if (snap.exists()) {
        const data = snap.data();
        const fecha = data.fechaEntrega && typeof data.fechaEntrega.toDate === 'function'
          ? data.fechaEntrega.toDate()
          : data.fechaEntrega;
        setFechaEntregaProyecto(fecha);
      }
    } catch (err) {
      console.error('Error al obtener fecha de entrega del proyecto:', err);
    }
  };

  const obtenerTareas = async () => {
    try {
      const q = query(collection(db, 'tareas'), where('proyectoId', '==', proyectoId));
      const querySnapshot = await getDocs(q);
      const tareasData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTareas(tareasData);
    } catch (error) {
      console.error('Error al obtener tareas:', error);
    }
  };

  const crearTarea = async () => {
    if (!nombre || !descripcion) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }

    try {
      await addDoc(collection(db, 'tareas'), {
        nombre,
        descripcion,
        proyectoId,
        creadorId: userId,
        fechaCreacion: Timestamp.now(),
        fechaEntrega: fechaEntregaProyecto,
        miembros: [],
        avance: 0
      });
      setNombre('');
      setDescripcion('');
      obtenerTareas();

      const avanceProyecto = await calcularAvanceTareas(proyectoId);
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      await updateDoc(proyectoRef, { avance: avanceProyecto });

    } catch (error) {
      Alert.alert('Error al crear la tarea.');
      console.error(error);
    }
  };

  const confirmarEliminacion = async () => {
    const email = auth.currentUser?.email;
    if (!email || !confirmPassword) {
      Alert.alert("Error", "Datos incompletos para confirmar.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, confirmPassword);
      await deleteDoc(doc(db, 'tareas', tareaAEliminar));
      Alert.alert('Éxito', 'Tarea eliminada correctamente');
      setModalVisible(false);
      setConfirmPassword('');
      obtenerTareas();

      const avanceProyecto = await calcularAvanceTareas(proyectoId);
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      await updateDoc(proyectoRef, { avance: avanceProyecto });

    } catch (error) {
      Alert.alert('Error', 'Contraseña incorrecta o fallo de conexión');
      setConfirmPassword('');
    }
  };

  const obtenerMiembros = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('rol', '==', 'miembro'));
      const querySnapshot = await getDocs(q);
      const miembros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMiembrosDisponibles(miembros);
    } catch (error) {
      console.error("Error al obtener miembros:", error);
    }
  };

  const asignarMiembro = async () => {
    if (!miembroSeleccionado || !tareaSeleccionada) {
      Alert.alert("Error", "Selecciona un miembro");
      return;
    }

    try {
      const tareaRef = doc(db, 'tareas', tareaSeleccionada.id);
      await updateDoc(tareaRef, {
        miembros: arrayUnion(miembroSeleccionado)
      });

      Alert.alert('Éxito', "Miembro asignado correctamente a la tarea");
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      obtenerTareas();
    } catch (error) {
      console.error("Error al asignar miembro a la tarea:", error);
      Alert.alert('Error', "No se pudo asignar el miembro");
    }
  };

  const verMiembrosAsignados = async (miembrosUIDs, tarea) => {
    try {
      setTareaSeleccionada(tarea);
      const validUIDs = miembrosUIDs?.filter(uid => uid && uid.trim() !== '') || [];
      if (validUIDs.length === 0) {
        setMiembrosAsignados([]);
        setModalVerMiembrosVisible(true);
        return;
      }

      const q = query(collection(db, 'usuarios'), where('__name__', 'in', validUIDs));
      const querySnapshot = await getDocs(q);
      const miembros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMiembrosAsignados(miembros);
      setModalVerMiembrosVisible(true);
    } catch (error) {
      console.error("Error al obtener miembros asignados:", error);
      Alert.alert('Error', "No se pudieron cargar los miembros");
    }
  };

  const eliminarMiembroDeTarea = async () => {
    try {
      const tareaRef = doc(db, 'tareas', tareaSeleccionada.id);
      await updateDoc(tareaRef, {
        miembros: arrayRemove(miembroAEliminar)
      });
      Alert.alert('Éxito', "Miembro eliminado de la tarea");
      setModalEliminarMiembro(false);
      setMiembroAEliminar(null);
      obtenerTareas();
    } catch (error) {
      console.error("Error al eliminar miembro de la tarea:", error);
      Alert.alert('Error', "No se pudo eliminar el miembro");
    }
  };
  
  return (
    <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#00796B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tareas del Proyecto</Text>
        </Animated.View>

        <Animated.View style={[styles.projectInfo, { opacity: fadeAnim }]}>
          <Text style={styles.projectDueDate}>
            <Icon name="event" size={16} color="#7C4DFF" /> 
            Fecha de entrega: {fechaEntregaProyecto ? new Date(fechaEntregaProyecto).toLocaleDateString() : 'No definida'}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.newTaskCard, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Crear Nueva Tarea</Text>
          
          <TextInput
            placeholder="Nombre de la tarea"
            placeholderTextColor="#90A4AE"
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
          />
          
          <TextInput
            placeholder="Descripción"
            placeholderTextColor="#90A4AE"
            value={descripcion}
            onChangeText={setDescripcion}
            style={[styles.input, styles.multilineInput]}
            multiline
          />
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={crearTarea}
          >
            <LinearGradient
              colors={['#7C4DFF', '#651FFF']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.createButtonText}>Crear Tarea</Text>
              <Icon name="add" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.tasksContainer, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Lista de Tareas</Text>
          
          {tareas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="assignment" size={50} color="#90A4AE" />
              <Text style={styles.emptyText}>No hay tareas creadas</Text>
            </View>
          ) : (
            <FlatList
              data={tareas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskName}>{item.nombre}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        setTareaAEliminar(item.id);
                        setModalVisible(true);
                      }}
                    >
                      <Icon name="delete" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.taskDescription}>{item.descripcion}</Text>
                  
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${item.avance ?? 0}%` }]} />
                    <Text style={styles.progressText}>{item.avance ?? 0}% completado</Text>
                  </View>
                  
                  <View style={styles.taskActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => {
                        setTareaSeleccionada(item);
                        obtenerMiembros();
                        setModalAsignarVisible(true);
                      }}
                    >
                      <Icon name="person-add" size={20} color="#7C4DFF" />
                      <Text style={styles.actionButtonText}>Asignar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => verMiembrosAsignados(item.miembros || [], item)}
                    >
                      <Icon name="people" size={20} color="#7C4DFF" />
                      <Text style={styles.actionButtonText}>Miembros</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('SubtareasTarea', {
                        tareaId: item.id,
                        userId,
                        userEmail: auth.currentUser?.email,
                        proyectoId
                      })}
                    >
                      <Icon name="list" size={20} color="#7C4DFF" />
                      <Text style={styles.actionButtonText}>Subtareas</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </Animated.View>

        {/* Modal para confirmar eliminación */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirmar eliminación</Text>
              <Text style={styles.modalText}>¿Estás seguro que deseas eliminar esta tarea?</Text>
              
              <TextInput
                placeholder="Confirma tu contraseña"
                placeholderTextColor="#90A4AE"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={confirmarEliminacion}
                >
                  <LinearGradient
                    colors={['#e53935', '#c62828']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmButtonText}>Eliminar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para asignar miembros */}
        <Modal visible={modalAsignarVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Asignar Miembro</Text>
              
              <ScrollView style={styles.modalScroll}>
                {miembrosDisponibles.map((miembro) => (
                  <TouchableOpacity
                    key={miembro.id}
                    onPress={() => setMiembroSeleccionado(miembro.id)}
                    style={[
                      styles.memberItem,
                      miembroSeleccionado === miembro.id && styles.selectedMember
                    ]}
                  >
                    <View style={styles.memberAvatar}>
                      <Icon name="person" size={24} color="#FFF" />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{miembro.nombre}</Text>
                      <Text style={styles.memberUsername}>@{miembro.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalAsignarVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={asignarMiembro}
                >
                  <LinearGradient
                    colors={['#7C4DFF', '#651FFF']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmButtonText}>Asignar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal para ver miembros asignados */}
        <Modal visible={modalVerMiembrosVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Miembros Asignados</Text>
              
              <ScrollView style={styles.modalScroll}>
                {miembrosAsignados.length === 0 ? (
                  <Text style={styles.emptyMembersText}>No hay miembros asignados</Text>
                ) : (
                  miembrosAsignados.map((miembro) => (
                    <TouchableOpacity
                      key={miembro.id}
                      style={styles.memberItem}
                      onLongPress={() => {
                        setMiembroAEliminar(miembro.id);
                        setModalVerMiembrosVisible(false);
                        setModalEliminarMiembro(true);
                      }}
                    >
                      <View style={styles.memberAvatar}>
                        <Icon name="person" size={24} color="#FFF" />
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{miembro.nombre}</Text>
                        <Text style={styles.memberUsername}>@{miembro.username}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVerMiembrosVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para confirmar eliminación de miembro */}
        <Modal visible={modalEliminarMiembro} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Eliminar Miembro</Text>
              <Text style={styles.modalText}>¿Quieres eliminar este miembro de la tarea?</Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalEliminarMiembro(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={eliminarMiembroDeTarea}
                >
                  <LinearGradient
                    colors={['#e53935', '#c62828']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmButtonText}>Eliminar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 25,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00796B',
    flex: 1,
  },
  projectInfo: {
    marginBottom: 15,
  },
  projectDueDate: {
    fontSize: 14,
    color: '#546E7A',
  },
  newTaskCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tasksContainer: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00796B',
    marginBottom: 15,
  },
  input: {
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#263238',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#90A4AE',
    marginTop: 10,
  },
  taskCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  taskDescription: {
    fontSize: 14,
    color: '#546E7A',
    marginBottom: 15,
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#ECEFF1',
    borderRadius: 5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7C4DFF',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'right',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  actionButtonText: {
    color: '#7C4DFF',
    fontSize: 14,
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00796B',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#546E7A',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: '60%',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#78909C',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#7C4DFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
  },
  selectedMember: {
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#7C4DFF',
  },
  memberAvatar: {
    backgroundColor: '#7C4DFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  memberUsername: {
    fontSize: 14,
    color: '#78909C',
  },
  emptyMembersText: {
    textAlign: 'center',
    color: '#90A4AE',
    fontSize: 16,
    padding: 20,
  },
});

export default TareasProyecto;