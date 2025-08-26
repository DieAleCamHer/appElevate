import React, { useEffect, useState, useRef } from 'react';
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
  ActivityIndicator,
  Dimensions,
  BackHandler
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
import { db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { calcularAvanceTareas } from '../utils/calcularPorcentaje';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const TareasProyecto = ({ route, navigation }) => {
  const { proyectoId, userId } = route.params;
  const [tareas, setTareas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntregaProyecto, setFechaEntregaProyecto] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Refs para "Hecho" en el teclado
  const descripcionRef = useRef(null);

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

    // Configurar el comportamiento del botón de retroceso físico
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack(); // Navegación normal hacia atrás
      return true; // Previene el comportamiento por defecto
    });

    return () => backHandler.remove();
  }, [navigation]);

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
      const tareasData = querySnapshot.docs.map(docu => ({ id: docu.id, ...docu.data() }));
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

        // Ojo: IN soporta máx. 10 IDs. Si hay más, trocear en lotes.
        const q = query(collection(db, 'usuarios'), where('__name__', 'in', miembrosProyecto.slice(0, 10)));
        const querySnapshot = await getDocs(q);
        const miembros = querySnapshot.docs.map(docu => ({ id: docu.id, ...docu.data() }));
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

      const q = query(collection(db, 'usuarios'), where('__name__', 'in', validUIDs.slice(0, 10)));
      const querySnapshot = await getDocs(q);
      const miembros = querySnapshot.docs.map(docu => ({ id: docu.id, ...docu.data() }));
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

  // Filtro con null-guards
  const miembrosFiltrados = miembrosDisponibles.filter(m =>
    (m?.nombre ?? '').toLowerCase().includes((searchText ?? '').toLowerCase()) ||
    (m?.username ?? '').toLowerCase().includes((searchText ?? '').toLowerCase())
  );

  return (
    <LinearGradient colors={['#3A7BD5', '#00D2FF']} style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <LinearGradient
            colors={['#3A7BD5', '#00D2FF']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Tareas del Proyecto</Text>

            <TouchableOpacity onPress={obtenerTareas} style={styles.refreshButton}>
              <Icon name="refresh" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Fecha de entrega */}
          <Animated.View style={[styles.projectInfo, { opacity: fadeAnim }]}>
            <Text style={styles.projectDueDate}>
              <Icon name="event" size={16} color="#3A7BD5" />{' '}
              Fecha de entrega: {fechaEntregaProyecto ? new Date(fechaEntregaProyecto).toLocaleDateString() : 'No definida'}
            </Text>
          </Animated.View>

          {/* Formulario de creación */}
          <Animated.View style={[styles.creationContainer, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Crear Nueva Tarea</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre de la tarea *"
              value={nombre}
              onChangeText={setNombre}
              returnKeyType="next"
              onSubmitEditing={() => descripcionRef.current?.focus()}
            />

            <TextInput
              ref={descripcionRef}
              style={[styles.input, styles.multilineInput]}
              placeholder="Descripción *"
              multiline
              value={descripcion}
              onChangeText={setDescripcion}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => {
                if (nombre.trim() && descripcion.trim()) crearTarea();
              }}
            />

            <TouchableOpacity
              style={styles.createButton}
              onPress={crearTarea}
              disabled={!nombre.trim() || !descripcion.trim()}
            >
              <Text style={styles.createButtonText}>Crear Tarea</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Lista de tareas */}
          <View style={styles.projectsContainer}>
            <Text style={styles.projectsTitle}>Lista de Tareas</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#3A7BD5" style={styles.loader} />
            ) : (
              <FlatList
                data={tareas}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.projectCard}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('SubtareasTarea', { tareaId: item.id, proyectoId, userId })}
                      style={styles.cardContent}
                    >
                      <View style={styles.projectHeader}>
                        <Text style={styles.projectName}>{item.nombre}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {item.completada ? (
                            <Icon name="check-circle" size={16} color="#4CAF50" />
                          ) : (
                            <Icon name="pending" size={16} color="#FF9800" />
                          )}
                        </View>
                      </View>

                      <Text style={styles.projectDescription}>{item.descripcion}</Text>

                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${Math.max(0, Math.min(100, item.avance ?? 0))}%` }]} />
                        <Text style={styles.progressText}>{item.avance ?? 0}% completado</Text>
                      </View>
                    </TouchableOpacity>

                    {/* BOTONES DE ACCIÓN */}
                    <View style={styles.projectActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e && e.stopPropagation?.();
                          setTareaSeleccionada(item);
                          obtenerMiembrosProyecto();
                          setModalAsignarVisible(true);
                        }}
                      >
                        <Icon name="person-add" size={20} color="#3A7BD5" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.membersButton}
                        onPress={(e) => {
                          e && e.stopPropagation?.();
                          verMiembrosAsignados(item.miembros || [], item);
                        }}
                      >
                        <Icon name="people" size={20} color="#3A7BD5" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e && e.stopPropagation?.();
                          setTareaAEliminar(item.id);
                          setModalVisible(true);
                        }}
                      >
                        <Icon name="delete" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="assignment" size={50} color="#90A4AE" />
                    <Text style={styles.emptyText}>No hay tareas creadas</Text>
                  </View>
                }
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        {/* Modal confirmar eliminación */}
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

        {/* Modal asignar miembros */}
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
                    colors={['#3A7BD5', '#00D2FF']}
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

        {/* Modal ver miembros asignados */}
        <Modal visible={modalVerMiembrosVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.customAlertContainer}>
              <Text style={styles.customAlertTitle}>Miembros Asignados</Text>

              <ScrollView style={styles.customAlertScroll}>
                {miembrosAsignados.length > 0 ? (
                  miembrosAsignados.map((miembro, index) => (
                    <View key={index} style={styles.memberListItem}>
                      <View style={styles.memberBullet}>
                        <Icon name="person" size={16} color="#3A7BD5" />
                      </View>
                      <Text style={styles.memberListText}>
                        {miembro.nombre} (@{miembro.username})
                      </Text>
                      <TouchableOpacity
                        style={styles.removeMemberButton}
                        onPress={() => {
                          setMiembroAEliminar(miembro.id);
                          setModalEliminarMiembro(true);
                          setModalVerMiembrosVisible(false);
                        }}
                      >
                        <Icon name="remove-circle" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.memberListText}>No hay miembros asignados</Text>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.customAlertButton}
                onPress={() => setModalVerMiembrosVisible(false)}
              >
                <Text style={styles.customAlertButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal confirmar eliminación de miembro */}
        <Modal visible={modalEliminarMiembro} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Eliminar Miembro</Text>
              <Text style={styles.deleteMessage}>
                ¿Estás seguro de que quieres eliminar a este miembro de la tarea?
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalEliminarMiembro(false);
                    setMiembroAEliminar(null);
                  }}
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 4,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    margin: 12,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  projectDueDate: {
    fontSize: 14,
    color: '#3A7BD5',
    fontWeight: '600',
  },
  creationContainer: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    margin: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#E3E9F1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
    color: '#263238',
    backgroundColor: '#F9FBFF',
    minHeight: 20,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  createButton: {
    backgroundColor: '#3A7BD5',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  projectsContainer: {
    paddingHorizontal: 12,
  },
  projectsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: 12,
    marginLeft: 4,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(58, 123, 213, 0.04)',
  },
  cardContent: {
    padding: 16,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
    marginRight: 10,
  },
  projectDescription: {
    color: '#5A6B7C',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#ECEFF1',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3A7BD5',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '500',
    textAlign: 'right',
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 123, 213, 0.08)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  actionButton: {
    marginLeft: 10,
    padding: 6,
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: 8,
  },
  membersButton: {
    marginLeft: 10,
    padding: 6,
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: 8,
  },
  deleteButton: {
    marginLeft: 10,
    padding: 6,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 10,
  },
  emptyText: {
    marginTop: 12,
    color: '#90A4AE',
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginVertical: 30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    width: '86%',
    maxHeight: '78%',
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: '65%',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#F5F5F5',
  },
  selectedMember: {
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderWidth: 1,
    borderColor: '#3A7BD5',
  },
  memberAvatar: {
    backgroundColor: '#3A7BD5',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  memberUsername: {
    fontSize: 12,
    color: '#78909C',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#78909C',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  customAlertContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '65%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  customAlertTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3A7BD5',
    textAlign: 'center',
    marginBottom: 14,
  },
  customAlertScroll: {
    maxHeight: '65%',
    marginBottom: 16,
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  memberBullet: {
    marginRight: 8,
  },
  memberListText: {
    fontSize: 14,
    color: '#546E7A',
    flex: 1,
    lineHeight: 20,
  },
  removeMemberButton: {
    padding: 4,
    marginLeft: 8,
  },
  customAlertButton: {
    backgroundColor: '#3A7BD5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  customAlertButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    color: '#263238',
    fontSize: 14,
  },
  passwordInput: {
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#263238',
  },
  deleteMessage: {
    fontSize: 14,
    color: '#546E7A',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyMembersText: {
    textAlign: 'center',
    color: '#90A4AE',
    fontSize: 14,
    padding: 20,
  },
});

export default TareasProyecto;