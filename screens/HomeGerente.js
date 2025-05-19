// screens/HomeGerente.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import ModalConfirmacion from '../components/ModalConfirmacion';

const HomeGerente = ({ route, navigation }) => {
  const { userId } = route.params;
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [miembrosDisponibles, setMiembrosDisponibles] = useState([]);
  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [modalVerMiembrosVisible, setModalVerMiembrosVisible] = useState(false);
  const [miembrosAsignados, setMiembrosAsignados] = useState([]);
  const [modalEliminarMiembro, setModalEliminarMiembro] = useState(false);

  const obtenerProyectos = async () => {
    try {
      const q = query(collection(db, 'proyectos'), where('creadorId', '==', userId));
      const querySnapshot = await getDocs(q);
      const proyectosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProyectos(proyectosData);
    } catch (error) {
      console.error(error);
    }
  };

  const crearProyecto = async () => {
    if (!nombre || !descripcion) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }
    const hoy = new Date();
    if (fechaEntrega <= hoy) {
      Alert.alert('Fecha inválida', 'La fecha de entrega debe ser posterior al día de hoy.');
      return;
    }

    try {
      await addDoc(collection(db, 'proyectos'), {
        nombre,
        descripcion,
        creadorId: userId,
        fechaEntrega: fechaEntrega.toISOString(),
        fechaCreacion: new Date().toISOString(),
        miembros: [],
        avance: 0
      });
      setNombre('');
      setDescripcion('');
      obtenerProyectos();
    } catch (error) {
      Alert.alert('Error al crear el proyecto');
    }
  };

  const confirmarEliminacion = async () => {
    const email = auth.currentUser.email;
    try {
      await signInWithEmailAndPassword(auth, email, confirmPassword);
      await deleteDoc(doc(db, 'proyectos', proyectoAEliminar));
      Alert.alert('Proyecto eliminado correctamente');
      setModalVisible(false);
      setConfirmPassword('');
      obtenerProyectos();
    } catch (error) {
      Alert.alert('Error', 'Contraseña incorrecta o fallo de conexión');
      setConfirmPassword('');
    }
  };

  const obtenerMiembros = async () => {
    try {
      const usuario = auth.currentUser;
      if (!usuario) {
        console.error("⚠️ No hay usuario autenticado.");
        Alert.alert("Error", "No se detectó sesión activa.");
        return;
      }
      const q = query(collection(db, 'usuarios'), where('rol', '==', 'miembro'));
      const querySnapshot = await getDocs(q);
      const miembros = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (!data.username || !data.nombre) {
          console.warn(`⛔ Documento con datos incompletos: ${doc.id}`);
          return null;
        }
        return { id: doc.id, ...data };
      }).filter(Boolean);
      setMiembrosDisponibles(miembros);
    } catch (error) {
      console.error('❌ Error al obtener miembros:', error);
      Alert.alert('Permisos insuficientes', 'No tienes acceso para leer la colección de usuarios. Revisa tus reglas de Firestore.');
    }
  };

  const asignarMiembro = async () => {
    if (!miembroSeleccionado || !proyectoSeleccionado) {
      Alert.alert('Selecciona un miembro');
      return;
    }
    try {
      const proyectoRef = doc(db, 'proyectos', proyectoSeleccionado.id);
      await updateDoc(proyectoRef, {
        miembros: arrayUnion(miembroSeleccionado)
      });
      Alert.alert('Miembro asignado correctamente');
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      obtenerProyectos();
    } catch (error) {
      console.error('Error al asignar miembro:', error);
    }
  };

  const eliminarMiembroProyecto = async () => {
    if (!miembroSeleccionado || !proyectoSeleccionado) return;
    try {
      const proyectoRef = doc(db, 'proyectos', proyectoSeleccionado.id);
      await updateDoc(proyectoRef, {
        miembros: arrayRemove(miembroSeleccionado)
      });
      Alert.alert('Miembro eliminado del proyecto');
      setModalVerMiembrosVisible(false);
      setMiembroSeleccionado(null);
      obtenerProyectos();
    } catch (error) {
      console.error('Error al eliminar miembro del proyecto:', error);
    }
  };

  const verMiembrosAsignados = async (miembrosUIDs) => {
    try {
      const validUIDs = miembrosUIDs.filter(uid => uid && uid.trim() !== '');
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
      console.error('Error al obtener miembros asignados:', error);
    }
  };

  useEffect(() => {
    obtenerProyectos();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen de Proyectos</Text>
      <FlatList
        data={proyectos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.proyectoItem}>
            <Text style={styles.proyectoNombre}>{item.nombre}</Text>
            <Text>{item.descripcion}</Text>
            <Text>Entrega: {new Date(item.fechaEntrega).toLocaleDateString()}</Text>
            <Text>Avance: {item.avance ?? 0}%</Text>
            <Button title="Ver tareas" onPress={() => navigation.navigate('TareasProyecto', { proyectoId: item.id, userId })} />
            <Button title="Asignar miembros" onPress={() => {
              setProyectoSeleccionado(item);
              obtenerMiembros();
              setModalAsignarVisible(true);
            }} />
            <Button title="Ver miembros asignados" onPress={() => {
              setProyectoSeleccionado(item);
              verMiembrosAsignados(item.miembros || []);
            }} />
          </View>
        )}
      />
      <Text style={styles.title}>Nuevo Proyecto</Text>
      <TextInput style={styles.input} placeholder="Nombre del proyecto" value={nombre} onChangeText={setNombre} />
      <TextInput style={styles.input} placeholder="Descripción" value={descripcion} onChangeText={setDescripcion} />
      <Button title="Seleccionar Fecha de Entrega" onPress={() => setShowDatePicker(true)} />
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
      <Button title="Crear Proyecto" onPress={crearProyecto} />

      <ModalConfirmacion
        visible={modalVisible}
        setVisible={setModalVisible}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        onConfirm={confirmarEliminacion}
        titulo="¿Deseas eliminar este proyecto?"
      />

      <Modal visible={modalAsignarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar miembro al proyecto</Text>
            <ScrollView>
              {miembrosDisponibles.map((miembro) => (
                <TouchableOpacity
                  key={miembro.id}
                  onPress={() => setMiembroSeleccionado(miembro.id)}
                  style={[styles.memberButton, miembroSeleccionado === miembro.id && styles.selectedButton]}
                >
                  <Text style={styles.memberText}>{miembro.nombre} ({miembro.username})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Confirmar asignación" onPress={asignarMiembro} />
            <Button title="Cancelar" onPress={() => setModalAsignarVisible(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={modalVerMiembrosVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Miembros asignados:</Text>
            <ScrollView>
              {miembrosAsignados.map((miembro, index) => (
                <TouchableOpacity
                  key={index}
                  onLongPress={() => {
                    setMiembroSeleccionado(miembro.id);
                    setModalEliminarMiembro(true);
                  }}
                >
                  <Text>- {miembro.nombre} ({miembro.username})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Cerrar" onPress={() => setModalVerMiembrosVisible(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={modalEliminarMiembro} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Eliminar este miembro del proyecto?</Text>
            <Button title="Eliminar" color="red" onPress={eliminarMiembroProyecto} />
            <Button title="Cancelar" onPress={() => setModalEliminarMiembro(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5
  },
  proyectoItem: {
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5
  },
  proyectoNombre: {
    fontWeight: 'bold',
    fontSize: 16
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 10
  },
  memberButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8
  },
  selectedButton: {
    backgroundColor: 'green'
  },
  memberText: {
    color: 'white',
    textAlign: 'center'
  }
});

export default HomeGerente;
