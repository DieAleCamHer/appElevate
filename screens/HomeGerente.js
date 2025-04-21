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
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

const HomeGerente = ({ route, navigation }) => {
  const { userId } = route.params;
  console.log("👤 userId recibido en HomeGerente:", userId);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
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

    try {
      await addDoc(collection(db, 'proyectos'), {
        nombre,
        descripcion,
        creadorId: userId,
        fechaCreacion: new Date().toISOString()
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
      console.log(error);
      Alert.alert('Error', 'Contraseña incorrecta o fallo de conexión');
      setConfirmPassword('');
    }
  };

  const obtenerMiembros = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('rol', '==', 'miembro'));
      const querySnapshot = await getDocs(q);
      const miembros = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMiembrosDisponibles(miembros);
    } catch (error) {
      console.error("Error al obtener miembros:", error);
    }
  };

  const asignarMiembro = async () => {
    if (!miembroSeleccionado || !proyectoSeleccionado) {
      Alert.alert("Selecciona un miembro");
      return;
    }

    try {
      const proyectoRef = doc(db, 'proyectos', proyectoSeleccionado.id);
      await updateDoc(proyectoRef, {
        miembros: arrayUnion(miembroSeleccionado)
      });

      Alert.alert("Miembro asignado correctamente");
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      obtenerProyectos();
    } catch (error) {
      console.error("Error al asignar miembro:", error);
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
      const miembros = querySnapshot.docs.map(doc => doc.data());
      setMiembrosAsignados(miembros);
      setModalVerMiembrosVisible(true);
    } catch (error) {
      console.error("Error al obtener miembros asignados:", error);
    }
  };

  useEffect(() => {
    obtenerProyectos();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Proyectos</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre del proyecto"
        value={nombre}
        onChangeText={setNombre}
      />
      <TextInput
        style={styles.input}
        placeholder="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
      />
      <Button title="Crear Proyecto" onPress={crearProyecto} />

      <FlatList
        data={proyectos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.proyectoItem}>
            <Text style={styles.proyectoNombre}>{item.nombre}</Text>
            <Text>{item.descripcion}</Text>
            <Button
              title="Eliminar"
              onPress={() => {
                console.log("🗑 Presionado eliminar para:", item.id);
                setProyectoAEliminar(item.id);
                setModalVisible(true);
              }}
            />
            <Button
              title="Asignar miembros"
              onPress={() => {
                console.log("👤 Asignar miembros para:", item.id);
                setProyectoSeleccionado(item);
                obtenerMiembros();
                setModalAsignarVisible(true);
              }}
            />
            <Button
              title="Ver miembros asignados"
              onPress={() => {
                console.log("👀 Ver miembros asignados para:", item.id);
                verMiembrosAsignados(item.miembros || []);
              }}
            />
            <Button
              title="Ver tareas"
              onPress={() => {
                console.log("📂 Ver tareas de proyecto:", item.id);
                navigation.navigate('TareasProyecto', { proyectoId: item.id, userId });
              }}
            />
          </View>
        )}
      />

      {/* 🔐 Modal de confirmación por contraseña */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Estás seguro que deseas eliminar este proyecto?</Text>
            <TextInput
              placeholder="Confirma tu contraseña"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Button title="Confirmar eliminación" onPress={confirmarEliminacion} />
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

      {/* 👥 Modal para asignar miembros */}
      <Modal visible={modalAsignarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar miembro al proyecto</Text>
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

      {/* 👁 Modal para ver miembros asignados */}
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
  title: { fontSize: 24, marginBottom: 15 },
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
  }
});

export default HomeGerente;
