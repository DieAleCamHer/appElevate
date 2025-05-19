// screens/TareasProyecto.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity
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
import ModalConfirmacion from '../components/ModalConfirmacion';

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

  const obtenerFechaEntregaProyecto = async () => {
    try {
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      const snap = await getDoc(proyectoRef);
      if (snap.exists()) {
        setFechaEntregaProyecto(snap.data().fechaEntrega || '');
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
        miembros: []
      });
      setNombre('');
      setDescripcion('');
      obtenerTareas();
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
      Alert.alert('Tarea eliminada correctamente');
      setModalVisible(false);
      setConfirmPassword('');
      obtenerTareas();
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
      Alert.alert("Selecciona un miembro");
      return;
    }

    try {
      const tareaRef = doc(db, 'tareas', tareaSeleccionada.id);
      await updateDoc(tareaRef, {
        miembros: arrayUnion(miembroSeleccionado)
      });

      Alert.alert("Miembro asignado correctamente a la tarea");
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      obtenerTareas();
    } catch (error) {
      console.error("Error al asignar miembro a la tarea:", error);
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
    }
  };

  const eliminarMiembroDeTarea = async () => {
    try {
      const tareaRef = doc(db, 'tareas', tareaSeleccionada.id);
      await updateDoc(tareaRef, {
        miembros: arrayRemove(miembroAEliminar)
      });
      Alert.alert("Miembro eliminado de la tarea");
      setModalEliminarMiembro(false);
      setMiembroAEliminar(null);
      obtenerTareas();
    } catch (error) {
      console.error("Error al eliminar miembro de la tarea:", error);
    }
  };

  useEffect(() => {
    obtenerTareas();
    obtenerFechaEntregaProyecto();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tareas del Proyecto</Text>

      <Text style={{ marginBottom: 5 }}>Fecha de entrega del proyecto: {fechaEntregaProyecto ? new Date(fechaEntregaProyecto).toLocaleDateString() : 'No definida'}</Text>

      <TextInput
        placeholder="Nombre de la tarea"
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />
      <TextInput
        placeholder="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        style={styles.input}
      />
      <Button title="Crear Tarea" onPress={crearTarea} />

      <FlatList
        data={tareas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tareaItem}>
            <Text style={styles.tareaNombre}>{item.nombre}</Text>
            <Text>{item.descripcion}</Text>
            <Text>Avance: {(typeof item.avance === 'number' ? item.avance : 0)}%</Text>
            <Button title="Eliminar" color="red" onPress={() => {
              setTareaAEliminar(item.id);
              setModalVisible(true);
            }} />
            <Button title="Asignar miembros" onPress={() => {
              setTareaSeleccionada(item);
              obtenerMiembros();
              setModalAsignarVisible(true);
            }} />
            <Button title="Ver miembros asignados" onPress={() => verMiembrosAsignados(item.miembros || [], item)} />
            <Button title="Ver subtareas" onPress={() => navigation.navigate('SubtareasTarea', {
              tareaId: item.id,
              userId,
              userEmail: auth.currentUser?.email,
              proyectoId
            })} />
          </View>
        )}
        style={{ marginTop: 20 }}
      />

      <ModalConfirmacion
        visible={modalVisible}
        setVisible={setModalVisible}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        onConfirm={confirmarEliminacion}
        titulo="¿Estás seguro que deseas eliminar esta tarea?"
      />

      {/* Asignar miembros */}
      <Modal visible={modalAsignarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar miembro a la tarea</Text>
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

      {/* Ver miembros asignados */}
      <Modal visible={modalVerMiembrosVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Miembros asignados:</Text>
            <ScrollView>
              {miembrosAsignados.length === 0 ? (
                <Text>No hay miembros asignados.</Text>
              ) : (
                miembrosAsignados.map((miembro, index) => (
                  <TouchableOpacity
                    key={index}
                    onLongPress={() => {
                      setMiembroAEliminar(miembro.id);
                      setModalVerMiembrosVisible(false);
                      setModalEliminarMiembro(true);
                    }}
                  >
                    <Text>- {miembro.nombre} ({miembro.username})</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <Button title="Cerrar" onPress={() => setModalVerMiembrosVisible(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={modalEliminarMiembro} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Eliminar este miembro de la tarea?</Text>
            <Button title="Eliminar" onPress={eliminarMiembroDeTarea} color="red" />
            <Button title="Cancelar" onPress={() => setModalEliminarMiembro(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5
  },
  tareaItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  tareaNombre: {
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

export default TareasProyecto;