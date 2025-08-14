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
  Easing,
  ActivityIndicator
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
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para modales
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

  // Animaciones
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
      setLoading(true);
      const q = query(collection(db, 'tareas'), where('proyectoId', '==', proyectoId));
      const querySnapshot = await getDocs(q);
      const tareasData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTareas(tareasData);
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      Alert.alert('Error', 'No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const crearTarea = async () => {
    if (!nombre.trim() || !descripcion.trim()) {
      Alert.alert('Error', 'Nombre y descripción son obligatorios');
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'tareas'), {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        proyectoId,
        creadorId: userId,
        fechaCreacion: Timestamp.now(),
        fechaEntrega: fechaEntregaProyecto,
        miembros: [],
        avance: 0,
        completada: false
      });
      
      setNombre('');
      setDescripcion('');
      await obtenerTareas();

      // Actualizar avance del proyecto
      const avanceProyecto = await calcularAvanceTareas(proyectoId);
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      await updateDoc(proyectoRef, { avance: avanceProyecto });

    } catch (error) {
      console.error('Error al crear tarea:', error);
      Alert.alert('Error', 'No se pudo crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!tareaAEliminar) return;
    
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'usuarios', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (confirmPassword !== userData.password) {
          Alert.alert('Error', 'Contraseña incorrecta');
          return;
        }

        await deleteDoc(doc(db, 'tareas', tareaAEliminar));
        setModalVisible(false);
        setConfirmPassword('');
        await obtenerTareas();

        // Actualizar avance del proyecto
        const avanceProyecto = await calcularAvanceTareas(proyectoId);
        const proyectoRef = doc(db, 'proyectos', proyectoId);
        await updateDoc(proyectoRef, { avance: avanceProyecto });

        Alert.alert('Éxito', 'Tarea eliminada correctamente');
      }
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      Alert.alert('Error', 'No se pudo eliminar la tarea');
    } finally {
      setLoading(false);
    }
  };

  const obtenerMiembrosProyecto = async () => {
    try {
      setLoading(true);
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      const proyectoSnap = await getDoc(proyectoRef);
      
      if (proyectoSnap.exists()) {
        const proyectoData = proyectoSnap.data();
        const miembrosProyecto = proyectoData.miembros || [];
        
        if (miembrosProyecto.length === 0) {
          setMiembrosDisponibles([]);
          return;
        }

        const q = query(collection(db, 'usuarios'), where('__name__', 'in', miembrosProyecto));
        const querySnapshot = await getDocs(q);
        const miembros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMiembrosDisponibles(miembros);
      }
    } catch (error) {
      console.error("Error al obtener miembros del proyecto:", error);
      Alert.alert('Error', 'No se pudieron cargar los miembros');
    } finally {
      setLoading(false);
    }
  };

  const asignarMiembro = async () => {
    if (!miembroSeleccionado || !tareaSeleccionada) {
      Alert.alert("Error", "Debes seleccionar un miembro");
      return;
    }

    try {
      setLoading(true);
      const tareaRef = doc(db, 'tareas', tareaSeleccionada.id);
      await updateDoc(tareaRef, {
        miembros: arrayUnion(miembroSeleccionado)
      });

      Alert.alert('Éxito', "Miembro asignado correctamente");
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      await obtenerTareas();
    } catch (error) {
      console.error("Error al asignar miembro:", error);
      Alert.alert('Error', "No se pudo asignar el miembro");
    } finally {
      setLoading(false);
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
    if (!miembroAEliminar || !tareaSeleccionada) return;
    
    try {
      setLoading(true);
      const tareaRef = doc(db, 'tareas', tareaSeleccionada.id);
      await updateDoc(tareaRef, {
        miembros: arrayRemove(miembroAEliminar)
      });
      
      Alert.alert('Éxito', "Miembro eliminado de la tarea");
      setModalEliminarMiembro(false);
      setMiembroAEliminar(null);
      await obtenerTareas();
    } catch (error) {
      console.error("Error al eliminar miembro:", error);
      Alert.alert('Error', "No se pudo eliminar el miembro");
    } finally {
      setLoading(false);
    }
  };

  const handleSubtareasPress = (tareaId) => {
    navigation.navigate('SubtareasTarea', {
      tareaId,
      proyectoId,
      userId
    });
  };

  // Filtrar miembros disponibles según búsqueda
  const miembrosFiltrados = miembrosDisponibles.filter(miembro => 
    miembro.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
    miembro.username.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity>
            <Icon name="arrow-back" size={24} color="#00796B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tareas del Proyecto</Text>
        </Animated.View>

        {/* Fecha de entrega */}
        <Animated.View style={[styles.projectInfo, { opacity: fadeAnim }]}>
          <Text style={styles.projectDueDate}>
            <Icon name="event" size={16} color="#7C4DFF" /> 
            Fecha de entrega: {fechaEntregaProyecto ? new Date(fechaEntregaProyecto).toLocaleDateString() : 'No definida'}
          </Text>
        </Animated.View>

        {/* Formulario de creación */}
        <Animated.View style={[styles.newTaskCard, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Crear Nueva Tarea</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nombre de la tarea *"
            placeholderTextColor="#90A4AE"
            value={nombre}
            onChangeText={setNombre}
          />
          
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Descripción *"
            placeholderTextColor="#90A4AE"
            multiline
            value={descripcion}
            onChangeText={setDescripcion}
          />
          
          <TouchableOpacity
            style={styles.createButton}
            onPress={crearTarea}
            disabled={!nombre.trim() || !descripcion.trim()}
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

        {/* Lista de tareas */}
        {loading ? (
          <ActivityIndicator size="large" color="#7C4DFF" style={styles.loader} />
        ) : (
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
                  <TouchableOpacity 
                    style={styles.taskCard}
                    onPress={() => handleSubtareasPress(item.id)}
                  >
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskName}>{item.nombre}</Text>
                      <Text style={styles.taskStatus}>
                        {item.completada ? (
                          <Icon name="check-circle" size={20} color="#4CAF50" />
                        ) : (
                          <Icon name="pending" size={20} color="#FF9800" />
                        )}
                      </Text>
                    </View>
                    
                    <Text style={styles.taskDescription}>{item.descripcion}</Text>
                    
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: `${item.avance ?? 0}%` }]} />
                      <Text style={styles.progressText}>{item.avance ?? 0}% completado</Text>
                    </View>
                    
                    <View style={styles.taskActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setTareaSeleccionada(item);
                          obtenerMiembrosProyecto();
                          setModalAsignarVisible(true);
                        }}
                      >
                        <Icon name="person-add" size={20} color="#7C4DFF" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          verMiembrosAsignados(item.miembros || [], item);
                        }}
                      >
                        <Icon name="people" size={20} color="#7C4DFF" />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setTareaAEliminar(item.id);
                          setModalVisible(true);
                        }}
                      >
                        <Icon name="delete" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            )}
          </Animated.View>
        )}

        {/* Modal para confirmar eliminación */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
              <Text style={styles.deleteMessage}>¿Estás seguro que deseas eliminar esta tarea?</Text>
              
              <TextInput
                style={styles.passwordInput}
                placeholder="Ingresa tu contraseña para confirmar"
                placeholderTextColor="#90A4AE"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              
              <View style={styles.modalActions}>
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
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#FF5252', '#FF1744']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmButtonText}>
                      {loading ? 'Eliminando...' : 'Eliminar'}
                    </Text>
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
              
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#90A4AE" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar miembros..."
                  placeholderTextColor="#90A4AE"
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
              
              <ScrollView style={styles.modalScroll}>
                {miembrosFiltrados.length > 0 ? (
                  miembrosFiltrados.map((miembro) => (
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
                  ))
                ) : (
                  <Text style={styles.emptyMembersText}>No hay miembros disponibles</Text>
                )}
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalAsignarVisible(false);
                    setSearchText('');
                    setMiembroSeleccionado(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={asignarMiembro}
                  disabled={!miembroSeleccionado || loading}
                >
                  <LinearGradient
                    colors={['#7C4DFF', '#651FFF']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmButtonText}>
                      {loading ? 'Asignando...' : 'Asignar'}
                    </Text>
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
                {miembrosAsignados.length > 0 ? (
                  miembrosAsignados.map((miembro) => (
                    <TouchableOpacity
                      key={miembro.id}
                      style={styles.memberItem}
                      onLongPress={() => {
                        setMiembroAEliminar(miembro.id);
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
                ) : (
                  <Text style={styles.emptyMembersText}>No hay miembros asignados</Text>
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
              <Text style={styles.deleteMessage}>¿Quieres eliminar este miembro de la tarea?</Text>
              
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
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#FF5252', '#FF1744']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.confirmButtonText}>
                      {loading ? 'Eliminando...' : 'Eliminar'}
                    </Text>
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
    backgroundColor: '#E0F7FA',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#00796B',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 45,
    flex: 1,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  projectInfo: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  projectDueDate: {
    fontSize: 16,
    color: '#7C4DFF',
    fontWeight: '600',
  },
  newTaskCard: {
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
    color: '#00796B',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 16,
    fontSize: 16,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#00796B',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tasksContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    flex: 1,
  },
  taskStatus: {
    marginLeft: 10,
  },
  taskDescription: {
    fontSize: 14,
    color: '#546E7A',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#ECEFF1',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7C4DFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'right',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
    color: '#90A4AE',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00796B',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteMessage: {
    fontSize: 16,
    color: '#546E7A',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalScroll: {
    maxHeight: '60%',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#546E7A',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E53935',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#00796B',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
    color: '#7C4DFF',
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#263238',
  },
  passwordInput: {
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f7fa',
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
    marginRight: 12,
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
  loader: {
    marginVertical: 40,
  },
});

export default TareasProyecto;