// screens/SubtareasTarea.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const SubtareasTarea = ({ route }) => {
  const { tareaId, userId, userEmail, proyectoId } = route.params;
  const [subtareas, setSubtareas] = useState([]);
  const [nombre, setNombre] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [subtareaAEliminar, setSubtareaAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    console.log("📬 Email recibido:", userEmail);
    obtenerSubtareas();
  }, []);

  const obtenerSubtareas = async () => {
    try {
      const q = query(collection(db, 'subtareas'), where('tareaId', '==', tareaId));
      const querySnapshot = await getDocs(q);
      const datos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubtareas(datos);
    } catch (error) {
      console.error('Error al obtener subtareas:', error);
    }
  };

  const crearSubtarea = async () => {
    if (!nombre) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }

    try {
      await addDoc(collection(db, 'subtareas'), {
        nombre,
        tareaId,
        completado: false,
        fechaCreacion: Timestamp.now()
      });
      setNombre('');
      obtenerSubtareas();
    } catch (error) {
      Alert.alert('Error al crear la subtarea.');
      console.error(error);
    }
  };

  const confirmarEliminacion = async () => {
    console.log("🚀 ENTRANDO A confirmarEliminacion()");
    const email = userEmail;
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
      console.log("✅ Autenticación exitosa, eliminando subtarea:", subtareaAEliminar);
      await deleteDoc(doc(db, 'subtareas', subtareaAEliminar));
      Alert.alert('Subtarea eliminada correctamente');
      setModalVisible(false);
      setConfirmPassword('');
      obtenerSubtareas();
    } catch (error) {
      console.log("❌ Error al eliminar subtarea:", error);
      Alert.alert('Error', 'Contraseña incorrecta o fallo de conexión');
      setConfirmPassword('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subtareas</Text>

      <TextInput
        placeholder="Nombre de la subtarea"
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />
      <Button title="Crear Subtarea" onPress={crearSubtarea} />

      <FlatList
        data={subtareas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>{item.nombre}</Text>
            <Text>{item.completado ? '✅ Completado' : '⏳ Pendiente'}</Text>
            <Button
              title="Eliminar"
              color="red"
              onPress={() => {
                console.log("🗑 Presionado eliminar subtarea:", item.id);
                setSubtareaAEliminar(item.id);
                setModalVisible(true);
              }}
            />
          </View>
        )}
        style={{ marginTop: 20 }}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              ¿Estás seguro que deseas eliminar esta subtarea?
            </Text>
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
                try {
                  console.log("🧪 CLICK EN CONFIRMAR");
                  confirmarEliminacion();
                } catch (err) {
                  console.log("❗ Error externo en onPress:", err);
                  Alert.alert("Error inesperado", err.message);
                }
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
  item: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  itemText: {
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
    width: '80%'
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 10
  }
});

export default SubtareasTarea;
