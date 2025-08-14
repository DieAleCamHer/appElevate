import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated, // Añadido para solucionar el error
  Easing // Añadido para las animaciones
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { calcularAvanceTareas } from '../utils/calcularPorcentaje';
import HistorialProyecto from './HistorialProyecto';
import TareasProyecto from './TareasProyecto';


const HomeGerente = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const [proyectos, setProyectos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [miembrosDisponibles, setMiembrosDisponibles] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [searchText, setSearchText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [proyectoAEditar, setProyectoAEditar] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Animaciones corregidas
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  const miembrosFiltrados = miembrosDisponibles.filter(miembro => 
    miembro.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
    miembro.username.toLowerCase().includes(searchText.toLowerCase())
  );
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

    obtenerProyectos();
  }, []);

  const obtenerProyectos = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'proyectos'), where('creadorId', '==', userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProyectos(data);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      Alert.alert('Error', 'No se pudieron cargar los proyectos');
    } finally {
      setLoading(false);
    }
  };

const crearProyecto = async () => {
  if (!nombre.trim() || !descripcion.trim() || !fechaEntrega || !userId) {
    Alert.alert('Error', 'Todos los campos son obligatorios');
    return;
  }

  try {
    await addDoc(collection(db, 'proyectos'), {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fechaEntrega: fechaEntrega.toISOString(),
      creadorId: userId, // Asegúrate que userId tenga valor
      avance: 0,
      miembros: [],
      historialComentarios: []
      });
      setNombre('');
      setDescripcion('');
      setFechaEntrega(new Date());
      await obtenerProyectos();
      } catch (error) {
        console.error('Error al crear proyecto:', error);
        Alert.alert('Error', error.message); // Muestra el mensaje de error completo
      }
  };

  const handleProyectoPress = (proyecto) => {
    navigation.navigate('TareasProyecto', { 
      proyectoId: proyecto.id,
      proyectoNombre: proyecto.nombre
    });
  };

  const obtenerMiembros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'usuarios'), where('rol', '==', 'miembro'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMiembrosDisponibles(data);
      setSearchText('');
    } catch (error) {
      console.error('Error al cargar miembros:', error);
    } finally {
      setLoading(false);
    }
  };

  const asignarMiembro = async () => {
    if (!proyectoSeleccionado || !miembroSeleccionado) {
      Alert.alert('Error', 'Debes seleccionar un proyecto y un miembro');
      return;
    }

    try {
      setLoading(true);
      const proyectoRef = doc(db, 'proyectos', proyectoSeleccionado.id);
      await updateDoc(proyectoRef, {
        miembros: arrayUnion(miembroSeleccionado),
        historialComentarios: arrayUnion({
          tipo: 'asignacion',
          miembroId: miembroSeleccionado,
          fecha: new Date().toISOString(),
          mensaje: `Miembro asignado al proyecto`
        })
      });
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      await obtenerProyectos();
    } catch (error) {
      console.error('Error al asignar miembro:', error);
      Alert.alert('Error', 'No se pudo asignar el miembro');
    } finally {
      setLoading(false);
    }
  };

  const eliminarProyecto = async () => {
    if (!proyectoAEliminar) return;
    
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'usuarios', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (password !== userData.password) {
          Alert.alert('Error', 'Contraseña incorrecta');
          return;
        }

        await deleteDoc(doc(db, 'proyectos', proyectoAEliminar));
        setModalVisible(false);
        setPassword('');
        await obtenerProyectos();
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      Alert.alert('Error', 'No se pudo eliminar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const verMiembrosAsignados = async (miembros) => {
    if (!miembros || miembros.length === 0) {
      setModalTitle('Miembros Asignados');
      setMembersList(['No hay miembros asignados']);
      setShowMembersModal(true);
      return;
    }

    try {
      setLoading(true);
      const nombres = [];

      for (const id of miembros) {
        const docRef = doc(db, 'usuarios', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          nombres.push(`${data.nombre} (@${data.username})`);
        } else {
          nombres.push(`ID no encontrado: ${id}`);
        }
      }

      setModalTitle('Miembros Asignados');
      setMembersList(nombres);
      setShowMembersModal(true);
    } catch (error) {
      console.error('Error al obtener miembros:', error);
      setModalTitle('Error');
      setMembersList(['No se pudieron cargar los miembros asignados']);
      setShowMembersModal(true);
    } finally {
      setLoading(false);
    }
  };

  const editarProyecto = async () => {
    if (!proyectoAEditar || !nombre.trim() || !descripcion.trim()) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    try {
      setLoading(true);
      const proyectoRef = doc(db, 'proyectos', proyectoAEditar.id);
      await updateDoc(proyectoRef, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        fechaEntrega: fechaEntrega.toISOString()
      });
      
      setEditModalVisible(false);
      await obtenerProyectos();
      Alert.alert('Éxito', 'Proyecto actualizado correctamente');
    } catch (error) {
      console.error('Error al editar proyecto:', error);
      Alert.alert('Error', 'No se pudo actualizar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const handleVerHistorial = (proyecto) => {
    navigation.navigate('HistorialProyecto', { proyectoId: proyecto.id });
  };

return (
  <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Proyectos</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* FORMULARIO DE CREACIÓN (SIEMPRE VISIBLE) */}
      <View style={styles.creationContainer}>
        <Text style={styles.sectionTitle}>Crear Nuevo Proyecto</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nombre del proyecto *"
          value={nombre}
          onChangeText={setNombre}
        />
        
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Descripción *"
          multiline
          value={descripcion}
          onChangeText={setDescripcion}
        />
        
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="event" size={20} color="#7C4DFF" />
          <Text style={styles.dateButtonText}>
            {fechaEntrega.toLocaleDateString() || 'Seleccionar fecha'}
          </Text>
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={fechaEntrega}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setFechaEntrega(selectedDate);
            }}
          />
        )}
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={crearProyecto}
          disabled={!nombre.trim() || !descripcion.trim()}
        >
          <Text style={styles.createButtonText}>Crear Proyecto</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE PROYECTOS */}
      {loading ? (
        <ActivityIndicator size="large" color="#7C4DFF" style={styles.loader} />
      ) : (
        <FlatList
          data={proyectos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.projectCard}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('TareasProyecto', {
                  proyectoId: item.id,
                  userId: userId,
                })}
                style={styles.cardContent}
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{item.nombre}</Text>
                  <Text style={styles.projectDueDate}>
                    <Icon name="event" size={16} color="#7C4DFF" /> 
                    {new Date(item.fechaEntrega).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text style={styles.projectDescription}>{item.descripcion}</Text>
                
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${item.avance ?? 0}%` }]} />
                  <Text style={styles.progressText}>{item.avance ?? 0}% completado</Text>
                </View>
              </TouchableOpacity>
              
              {/* BOTONES DE ACCIÓN (INCLUYENDO VER MIEMBROS) */}
              <View style={styles.projectActions}>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => handleVerHistorial(item)}
                >
                  <Icon name="history" size={20} color="#FF9800" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => {
                    setProyectoAEditar(item);
                    setNombre(item.nombre);
                    setDescripcion(item.descripcion);
                    setFechaEntrega(new Date(item.fechaEntrega));
                    setEditModalVisible(true);
                  }}
                >
                  <Icon name="edit" size={20} color="#4CAF50" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setProyectoSeleccionado(item);
                    obtenerMiembros();
                    setModalAsignarVisible(true);
                  }}
                >
                  <Icon name="person-add" size={20} color="#7C4DFF" />
                </TouchableOpacity>
                
                {/* BOTÓN PARA VER MIEMBROS ASIGNADOS */}
                <TouchableOpacity 
                  style={styles.membersButton}
                  onPress={() => verMiembrosAsignados(item.miembros || [])}
                >
                  <Icon name="people" size={20} color="#7C4DFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => {
                    setProyectoAEliminar(item.id);
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
              <Icon name="folder" size={50} color="#90A4AE" />
              <Text style={styles.emptyText}>No tienes proyectos aún</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
                {miembrosFiltrados.map((miembro) => (
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

        {/* Modal para mostrar miembros asignados */}
        <Modal 
          visible={showMembersModal} 
          transparent 
          animationType="fade"
          onRequestClose={() => setShowMembersModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.customAlertContainer}>
              <Text style={styles.customAlertTitle}>{modalTitle}</Text>
              
              <ScrollView style={styles.customAlertScroll}>
                {membersList.map((miembro, index) => (
                  <View key={index} style={styles.memberListItem}>
                    <View style={styles.memberBullet}>
                      <Icon name="person" size={16} color="#7C4DFF" />
                    </View>
                    <Text style={styles.memberListText}>{miembro}</Text>
                  </View>
                ))}
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.customAlertButton}
                onPress={() => setShowMembersModal(false)}
              >
                <Text style={styles.customAlertButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal para eliminar proyecto */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
              <Text style={styles.deleteMessage}>¿Estás seguro que deseas eliminar este proyecto?</Text>
              
              <TextInput
                style={styles.passwordInput}
                placeholder="Ingresa tu contraseña para confirmar"
                placeholderTextColor="#90A4AE"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    setPassword('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={eliminarProyecto}
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

        {/* Modal para editar proyecto */}
        <Modal visible={editModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Editar Proyecto</Text>
              
              <TextInput 
                style={styles.input} 
                placeholder="Nombre del proyecto *" 
                value={nombre} 
                onChangeText={setNombre} 
              />
              
              <TextInput 
                style={[styles.input, styles.multilineInput]} 
                placeholder="Descripción *" 
                multiline
                value={descripcion} 
                onChangeText={setDescripcion} 
              />
              
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="event" size={20} color="#7C4DFF" />
                <Text style={styles.dateButtonText}>
                  {fechaEntrega.toLocaleDateString()}
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
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={editarProyecto}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#2E7D32']}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.confirmButtonText}>
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
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
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00796B',
  },
  backButton: {
    padding: 5,
  },
  creationContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00796B',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  dateButtonText: {
    marginLeft: 10,
  },
  createButton: {
    backgroundColor: '#7C4DFF',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 15,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
  },
  projectDueDate: {
    color: '#7C4DFF',
  },
  projectDescription: {
    color: '#616161',
    marginBottom: 10,
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#ECEFF1',
    borderRadius: 5,
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7C4DFF',
  },
  progressText: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'right',
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    marginLeft: 10,
    padding: 5,
  },
  membersButton: {
    marginLeft: 10,
    padding: 5,
  },
  editButton: {
    marginLeft: 10,
    padding: 5,
  },
  deleteButton: {
    marginLeft: 10,
    padding: 5,
  },
  historyButton: {
    marginLeft: 10,
    padding: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    color: '#90A4AE',
  },
  listContent: {
    paddingBottom: 20,
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
  modalScroll: {
    maxHeight: '70%',
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  customAlertContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  customAlertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00796B',
    textAlign: 'center',
    marginBottom: 15,
  },
  customAlertScroll: {
    maxHeight: '70%',
    marginBottom: 20,
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberBullet: {
    marginRight: 10,
  },
  memberListText: {
    fontSize: 16,
    color: '#546E7A',
    flex: 1,
  },
  customAlertButton: {
    backgroundColor: '#7C4DFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  customAlertButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#263238',
  },
  passwordInput: {
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#263238',
  },
  deleteMessage: {
    fontSize: 16,
    color: '#546E7A',
    marginBottom: 20,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 40,
  },
});

export default HomeGerente;