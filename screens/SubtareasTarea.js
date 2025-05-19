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
import DateTimePicker from '@react-native-community/datetimepicker';
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
  getDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  calcularAvanceSubtareas,
  calcularAvanceTareas
} from '../utils/calcularPorcentaje';

const SubtareasTarea = ({ route }) => {
  const { tareaId, userId, userEmail, proyectoId } = route.params;
  const [subtareas, setSubtareas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [subtareaAEliminar, setSubtareaAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fechaEntregaTarea, setFechaEntregaTarea] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    obtenerSubtareas();
    obtenerFechaEntregaTarea();
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

  const obtenerFechaEntregaTarea = async () => {
    try {
      const tareaRef = doc(db, 'tareas', tareaId);
      const snap = await getDoc(tareaRef);
      if (snap.exists()) {
        setFechaEntregaTarea(snap.data().fechaEntrega || '');
      }
    } catch (err) {
      console.error('Error al obtener fecha de la tarea:', err);
    }
  };

  const actualizarAvance = async () => {
    try {
      const avanceTarea = await calcularAvanceSubtareas(tareaId);
      const tareaRef = doc(db, 'tareas', tareaId);
      await updateDoc(tareaRef, { avance: avanceTarea });

      const avanceProyecto = await calcularAvanceTareas(proyectoId);
      const proyectoRef = doc(db, 'proyectos', proyectoId);
      await updateDoc(proyectoRef, { avance: avanceProyecto });
    } catch (error) {
      console.error('Error al actualizar porcentaje:', error);
    }
  };

  const crearSubtarea = async () => {
    if (!nombre) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    if (fechaEntregaTarea && fechaEntrega > new Date(fechaEntregaTarea)) {
      Alert.alert('Error', 'La fecha de la subtarea no puede superar la de la tarea.');
      return;
    }

    try {
      await addDoc(collection(db, 'subtareas'), {
        nombre,
        tareaId,
        completado: false,
        fechaEntrega: fechaEntrega.toISOString(),
        fechaCreacion: Timestamp.now()
      });
      setNombre('');
      await obtenerSubtareas();
      await actualizarAvance();
    } catch (error) {
      Alert.alert('Error al crear la subtarea.');
      console.error(error);
    }
  };

  const confirmarEliminacion = async () => {
    const email = userEmail;

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
      await deleteDoc(doc(db, 'subtareas', subtareaAEliminar));
      Alert.alert('Subtarea eliminada correctamente');
      setModalVisible(false);
      setConfirmPassword('');
      await obtenerSubtareas();
      await actualizarAvance();
    } catch (error) {
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

      <Button title="Seleccionar fecha de entrega" onPress={() => setShowDatePicker(true)} />
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

      <Button title="Crear Subtarea" onPress={crearSubtarea} />

      <FlatList
        data={subtareas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>{item.nombre}</Text>
            <Text>{item.completado ? '✅ Completado' : '⏳ Pendiente'}</Text>
            <Text>Entrega: {item.fechaEntrega ? new Date(item.fechaEntrega).toLocaleDateString() : 'N/A'}</Text>
            <Button
              title="Eliminar"
              color="red"
              onPress={() => {
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
