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
  ScrollView
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
  arrayUnion
} from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

const TareasProyecto = ({ route, navigation }) => {
  const { proyectoId, userId } = route.params;
  const [tareas, setTareas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [tareaAEliminar, setTareaAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [miembrosDisponibles, setMiembrosDisponibles] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);

  const [modalVerMiembrosVisible, setModalVerMiembrosVisible] = useState(false);
  const [miembrosAsignados, setMiembrosAsignados] = useState([]);

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
        fechaCreacion: Timestamp.now()
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
    console.log("🔐 Intentando confirmar eliminación con:", email);
  
    if (!email) {
      Alert.alert("Error", "No se pudo obtener el correo del usuario autenticado.");
      return;
    }
  
    if (!confirmPassword) {
      Alert.alert("Error", "Por favor ingresa tu contraseña.");
      return;
    }
  
    try {
      await signInWithEmailAndPassword(auth, email, confirmPassword);
      console.log("✅ Autenticación exitosa, procediendo a eliminar tarea:", tareaAEliminar);
      await deleteDoc(doc(db, 'tareas', tareaAEliminar));
      Alert.alert('Tarea eliminada correctamente');
      setModalVisible(false);
      setConfirmPassword('');
      obtenerTareas();
    } catch (error) {
      console.log("❌ Error al eliminar tarea:", error);
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

  const verMiembrosAsignados = async (miembrosUIDs) => {
    try {
      const validUIDs = miembrosUIDs?.filter(uid => uid && uid.trim() !== '') || [];

      if (validUIDs.length === 0) {
        setMiembrosAsignados([]);
        setModalVerMiembrosVisible(true);
        return;
      }

      const q = query(collection(db, 'usuarios'), where('__name__', 'in', validUIDs));
      const querySnapshot = await getDocs(q);
      const miembros = querySnapshot.docs.map(doc => doc.data());
      setMiembrosAsignados(miembros);
      setModalVerMiembrosVisible(true);
    } catch (error) {
      console.error("Error al obtener miembros asignados:", error);
    }
  };

  useEffect(() => {
    obtenerTareas();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tareas del Proyecto</Text>

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
            <Button
              title="Eliminar"
              color="red"
              onPress={() => {
                setTareaAEliminar(item.id);
                setModalVisible(true);
              }}
            />
            <Button
              title="Asignar miembros"
              onPress={() => {
                setTareaSeleccionada(item);
                obtenerMiembros();
                setModalAsignarVisible(true);
              }}
            />
            <Button
              title="Ver miembros asignados"
              onPress={() => verMiembrosAsignados(item.miembros || [])}
            />
            <Button
              title="Ver subtareas"
              onPress={() => navigation.navigate('SubtareasTarea', {
                tareaId: item.id,
                userId: userId,
                userEmail: auth.currentUser?.email, // 🔥 asegúrate de pasar esto
                proyectoId: proyectoId
              })}
            />
          </View>
        )}
        style={{ marginTop: 20 }}
      />
{/*Modal de eliminacion con contraseña*/ }
<Modal visible={modalVisible} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>¿Estás seguro que deseas eliminar esta tarea?</Text>
      <TextInput
        placeholder="Confirma tu contraseña"
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <Button
        title="Confirmar eliminación"
        onPress={() => {
          console.log("🧪 CLICK EN CONFIRMAR");
          confirmarEliminacion();
        }}
      />
      <View style={{ marginTop: 10 }}>
        <Button
          title="Cancelar"
          onPress={() => {
            setModalVisible(false);
            setConfirmPassword('');
          }}
        />
      </View>
    </View>
  </View>
</Modal>


      {/* Modal para asignar miembros */}
      <Modal visible={modalAsignarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar miembro a la tarea</Text>
            <ScrollView>
              {miembrosDisponibles.map((miembro) => (
                <View key={miembro.id} style={{ marginBottom: 10 }}>
                  <Button
                    title={`${miembro.nombre} (${miembro.username})`}
                    onPress={() => setMiembroSeleccionado(miembro.id)}
                    color={miembroSeleccionado === miembro.id ? 'green' : undefined}
                  />
                </View>
              ))}
            </ScrollView>
            <Button title="Confirmar asignación" onPress={asignarMiembro} />
            <View style={{ marginTop: 10 }}>
              <Button title="Cancelar" onPress={() => setModalAsignarVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para ver miembros asignados */}
      <Modal visible={modalVerMiembrosVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Miembros asignados:</Text>
            <ScrollView>
              {miembrosAsignados.length === 0 ? (
                <Text>No hay miembros asignados.</Text>
              ) : (
                miembrosAsignados.map((miembro, index) => (
                  <Text key={index}>- {miembro.nombre} ({miembro.username})</Text>
                ))
              )}
            </ScrollView>
            <View style={{ marginTop: 10 }}>
              <Button title="Cerrar" onPress={() => setModalVerMiembrosVisible(false)} />
            </View>
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
  }
});

export default TareasProyecto;
