// screens/TareasProyectoMiembro.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Button,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const TareasProyectoMiembro = ({ route, navigation }) => {
  const { proyectoId, userId } = route.params;
  const [tareas, setTareas] = useState([]);

  const obtenerTareasAsignadas = async () => {
    try {
      const q = query(
        collection(db, 'tareas'),
        where('proyectoId', '==', proyectoId),
        where('miembros', 'array-contains', userId)
      );
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTareas(datos);
    } catch (error) {
      console.error('Error al obtener tareas asignadas:', error);
    }
  };

  useEffect(() => {
    obtenerTareasAsignadas();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tareas Asignadas</Text>
      <FlatList
        data={tareas}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('SubtareasMiembro', {
                tareaId: item.id,
                userId,
                proyectoId,
              })
            }
          >
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text>{item.descripcion}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, marginTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  nombre: {
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default TareasProyectoMiembro;
