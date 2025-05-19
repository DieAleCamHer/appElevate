// screens/HistorialProyecto.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Picker
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const HistorialProyecto = ({ route }) => {
  const { proyectoId } = route.params;
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const obtenerHistorial = async () => {
    try {
      const q = query(
        collection(db, 'historial'),
        where('proyectoId', '==', proyectoId),
        orderBy('fechaCambio', 'desc')
      );
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorial(datos);
    } catch (error) {
      console.error('Error al obtener historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const historialFiltrado = historial.filter(item => {
    const matchUsuario = filtroUsuario === '' || item.usuarioUsername.toLowerCase().includes(filtroUsuario.toLowerCase());
    const matchEstado = filtroEstado === '' || item.estadoNuevo.toLowerCase().includes(filtroEstado.toLowerCase());
    return matchUsuario && matchEstado;
  });

  useEffect(() => {
    obtenerHistorial();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 Historial de Cambios</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar por usuario (username)"
        value={filtroUsuario}
        onChangeText={setFiltroUsuario}
      />

      <TextInput
        style={styles.input}
        placeholder="Filtrar por estado (opcional)"
        value={filtroEstado}
        onChangeText={setFiltroEstado}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : historialFiltrado.length === 0 ? (
        <Text style={styles.emptyText}>No hay registros que coincidan con los filtros.</Text>
      ) : (
        <FlatList
          data={historialFiltrado}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.label}>👤 Usuario:</Text>
              <Text>{item.usuarioNombre} ({item.usuarioUsername})</Text>
              <Text style={styles.label}>📌 Estado nuevo:</Text>
              <Text>{item.estadoNuevo}</Text>
              <Text style={styles.label}>💬 Comentario:</Text>
              <Text>{item.comentario}</Text>
              <Text style={styles.label}>🕒 Fecha:</Text>
              <Text>{new Date(item.fechaCambio?.seconds * 1000).toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 40,
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 10,
    borderRadius: 5
  },
  item: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#007BFF'
  },
  label: {
    fontWeight: 'bold',
    marginTop: 5
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#888'
  }
});

export default HistorialProyecto;