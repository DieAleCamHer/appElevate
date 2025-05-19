// screens/HomeMiembro.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const HomeMiembro = ({ route, navigation }) => {
  const { userId } = route.params;
  const [proyectos, setProyectos] = useState([]);

  const obtenerProyectosAsignados = async () => {
    try {
      const q = query(collection(db, 'proyectos'), where('miembros', 'array-contains', userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProyectos(data);
    } catch (error) {
      console.error('Error al obtener proyectos asignados:', error);
    }
  };

  useEffect(() => {
    obtenerProyectosAsignados();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Proyectos Asignados</Text>
      <FlatList
        data={proyectos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text>{item.descripcion}</Text>
            <Button
              title="Ver Tareas"
              onPress={() =>
                navigation.navigate('TareasProyectoMiembro', {
                  proyectoId: item.id,
                  userId
                })
              }
            />
          </View>
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
    borderRadius: 10,
    marginBottom: 15
  },
  nombre: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5
  }
});

export default HomeMiembro;
