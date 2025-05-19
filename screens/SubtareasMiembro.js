// screens/SubtareasMiembro.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Button, StyleSheet, Modal, TextInput, Alert, TouchableOpacity, ScrollView
} from 'react-native';
import {
  collection, query, where, getDocs, updateDoc, doc, addDoc, Timestamp, getDoc, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ESTADOS, listaEstados } from '../utils/estados';

const SubtareasMiembro = ({ route }) => {
  const { tareaId, userId, proyectoId } = route.params;
  const [subtareas, setSubtareas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [comentario, setComentario] = useState('');
  const [subtareaSeleccionada, setSubtareaSeleccionada] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [modalEliminarMiembro, setModalEliminarMiembro] = useState(false);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [miembrosAsignados, setMiembrosAsignados] = useState([]);

  const obtenerSubtareas = async () => {
    try {
      const q = query(collection(db, 'subtareas'), where('tareaId', '==', tareaId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubtareas(data);
    } catch (error) {
      console.error('Error al obtener subtareas:', error);
    }
  };

  const obtenerUsuario = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('__name__', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setUserInfo(snap.docs[0].data());
      }
    } catch (error) {
      console.error('Error al obtener usuario:', error);
    }
  };

  const cambiarEstado = async () => {
    if (!comentario || !nuevoEstado || !subtareaSeleccionada) {
      Alert.alert('Error', 'Debes ingresar un comentario y seleccionar un estado');
      return;
    }

    try {
      const subtareaRef = doc(db, 'subtareas', subtareaSeleccionada.id);
      const subtareaSnap = await getDoc(subtareaRef);
      const subtareaData = subtareaSnap.data();

      if (subtareaData.estado === nuevoEstado) {
        Alert.alert('Error', 'El estado seleccionado es igual al actual.');
        return;
      }

      let estadoFinal = nuevoEstado;

      if (nuevoEstado === ESTADOS.FINALIZADO) {
        const hoy = new Date();
        const fechaEntrega = subtareaData?.fechaEntrega ? new Date(subtareaData.fechaEntrega) : null;
        if (fechaEntrega && hoy > fechaEntrega) {
          estadoFinal = ESTADOS.ENTREGA_TARDIA;
        }
      }

      await updateDoc(subtareaRef, {
        estado: estadoFinal,
        completado: estadoFinal === ESTADOS.FINALIZADO || estadoFinal === ESTADOS.ENTREGA_TARDIA
      });

      await addDoc(collection(db, 'historial'), {
        usuarioId: userId,
        usuarioNombre: userInfo?.nombre || '',
        usuarioUsername: userInfo?.username || '',
        proyectoId,
        tareaId,
        subtareaId: subtareaSeleccionada.id,
        estadoNuevo: estadoFinal,
        comentario,
        fechaCambio: Timestamp.now()
      });

      setModalVisible(false);
      setComentario('');
      setNuevoEstado('');
      setSubtareaSeleccionada(null);
      obtenerSubtareas();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  useEffect(() => {
    obtenerSubtareas();
    obtenerUsuario();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📋 Mis Subtareas</Text>
      <FlatList
        data={subtareas}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.estado}>Estado: {item.estado || 'pendiente'}</Text>
            <TouchableOpacity
              style={styles.btnEstado}
              onPress={() => {
                setSubtareaSeleccionada(item);
                setModalVisible(true);
              }}
            >
              <Text style={styles.btnEstadoTexto}>Cambiar Estado</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Actualizar Estado</Text>
            {listaEstados.map((estado) => (
              <TouchableOpacity
                key={estado}
                onPress={() => setNuevoEstado(estado)}
                style={[styles.estadoBtn, nuevoEstado === estado && styles.estadoBtnSeleccionado]}
              >
                <Text style={styles.estadoBtnTexto}>{estado}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              placeholder="Comentario obligatorio"
              style={styles.input}
              value={comentario}
              onChangeText={setComentario}
            />
            <Button title="Guardar" onPress={cambiarEstado} />
            <View style={{ marginTop: 10 }}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  item: {
    backgroundColor: '#e6f0ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2
  },
  nombre: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 5
  },
  estado: {
    marginBottom: 8,
    fontSize: 14
  },
  btnEstado: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5
  },
  btnEstadoTexto: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 10,
    borderRadius: 5
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
    width: '85%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  estadoBtn: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5
  },
  estadoBtnSeleccionado: {
    backgroundColor: '#cce5ff'
  },
  estadoBtnTexto: {
    textAlign: 'center',
    fontWeight: 'bold'
  }
});

export default SubtareasMiembro;