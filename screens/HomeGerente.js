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
  Image,
  Animated,
  Easing
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

    obtenerProyectos();
  }, []);

  const obtenerProyectos = async () => {
    try {
      const q = query(collection(db, 'proyectos'), where('creadorId', '==', userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProyectos(data);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      Alert.alert('Error', 'No se pudieron cargar los proyectos');
    }
  };

  const crearProyecto = async () => {
    if (!nombre || !descripcion || !fechaEntrega) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      await addDoc(collection(db, 'proyectos'), {
        nombre,
        descripcion,
        fechaEntrega: fechaEntrega.toISOString(),
        creadorId: userId,
        avance: 0,
        miembros: []
      });
      setNombre('');
      setDescripcion('');
      setFechaEntrega(new Date());
      await obtenerProyectos();
      await calcularAvanceTareas(userId);
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      Alert.alert('Error', 'No se pudo crear el proyecto');
    }
  };

  const obtenerMiembros = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('rol', '==', 'miembro'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMiembrosDisponibles(data);
    } catch (error) {
      console.error('Error al cargar miembros:', error);
    }
  };

  const asignarMiembro = async () => {
    if (!proyectoSeleccionado || !miembroSeleccionado) return;
    try {
      const proyectoRef = doc(db, 'proyectos', proyectoSeleccionado.id);
      await updateDoc(proyectoRef, {
        miembros: arrayUnion(miembroSeleccionado)
      });
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      await obtenerProyectos();
      await calcularAvanceTareas(proyectoSeleccionado.id);
    } catch (error) {
      console.error('Error al asignar miembro:', error);
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

      setModalTitle('🧑‍💻 Miembros Asignados');
      setMembersList(nombres);
      setShowMembersModal(true);
    } catch (error) {
      console.error('Error al obtener miembros:', error);
      setModalTitle('⚠️ Error');
      setMembersList(['No se pudieron cargar los miembros asignados']);
      setShowMembersModal(true);
    }
  };

  return (
    <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.headerTitle}>Mis Proyectos</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#00796B" />
          </TouchableOpacity>
        </Animated.View>

        {/* Lista de Proyectos */}
        <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
          <FlatList
            data={proyectos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.projectCard}
                onPress={() => navigation.navigate('TareasProyecto', { proyectoId: item.id, userId })}
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{item.nombre}</Text>
                  <Text style={styles.projectDueDate}>
                    <Icon name="event" size={16} color="#7C4DFF" /> {new Date(item.fechaEntrega).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text style={styles.projectDescription}>{item.descripcion}</Text>
                
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${item.avance ?? 0}%` }]} />
                  <Text style={styles.progressText}>{item.avance ?? 0}% completado</Text>
                </View>
                
                <View style={styles.projectActions}>
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
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      setProyectoSeleccionado(item);
                      verMiembrosAsignados(item.miembros || []);
                    }}
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
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="folder" size={50} color="#90A4AE" />
                <Text style={styles.emptyText}>No tienes proyectos aún</Text>
              </View>
            }
          />
        </Animated.View>

        {/* Formulario Nuevo Proyecto */}
        <Animated.View style={[styles.newProjectCard, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Crear Nuevo Proyecto</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Nombre del proyecto" 
            placeholderTextColor="#90A4AE"
            value={nombre} 
            onChangeText={setNombre} 
          />
          
          <TextInput 
            style={[styles.input, styles.multilineInput]} 
            placeholder="Descripción" 
            placeholderTextColor="#90A4AE"
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
              {fechaEntrega.toLocaleDateString() || 'Seleccionar fecha de entrega'}
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
            onPress={crearProyecto}
          >
            <LinearGradient
              colors={['#7C4DFF', '#651FFF']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.createButtonText}>Crear Proyecto</Text>
              <Icon name="add" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Modal para asignar miembros (existente) */}
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

        {/* Modal personalizado para mostrar miembros asignados (nuevo) */}
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

        {/* Modal de Confirmación (similar al de asignar pero para eliminar) */}
        {/* ... */}

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00796B',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: 10,
  },
  cardContainer: {
    flex: 1,
    marginBottom: 20,
  },
  projectCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#263238',
    flex: 1,
  },
  projectDueDate: {
    fontSize: 14,
    color: '#7C4DFF',
  },
  projectDescription: {
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
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderRadius: 20,
    padding: 8,
    marginLeft: 10,
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
  newProjectCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#263238',
    marginLeft: 10,
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
  // Nuevos estilos para el modal personalizado
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
});

export default HomeGerente; 