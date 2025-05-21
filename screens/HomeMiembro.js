import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ImageBackground, StatusBar, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const HomeMiembro = ({ route, navigation }) => {
  const { userId } = route.params;
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);

  const obtenerProyectosAsignados = async () => {
    try {
      const q = query(collection(db, 'proyectos'), where('miembros', 'array-contains', userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProyectos(data);
    } catch (error) {
      console.error('Error al obtener proyectos asignados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerProyectosAsignados();
  }, []);

  const renderProyectoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TareasProyectoMiembro', {
        proyectoId: item.id,
        userId
      })}
    >
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <MaterialIcons name="work" size={24} color="#0D47A1" />
          <Text style={styles.nombre}>{item.nombre}</Text>
        </View>
        
        <Text style={styles.descripcion}>{item.descripcion}</Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.estado}>{item.estado || 'En progreso'}</Text>
          <View style={styles.verTareasButton}>
            <Text style={styles.verTareasText}>Ver Tareas</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#0D47A1" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <ImageBackground 
      source={require('../assets/logo.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      <View style={styles.container}>
        <LinearGradient
          colors={['#0D47A1', '#1976D2']}
          style={styles.header}
        >
          <Text style={styles.title}>Mis Proyectos Asignados</Text>
          <Text style={styles.subtitle}>Tienes {proyectos.length} proyectos activos</Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D47A1" />
            <Text style={styles.loadingText}>Cargando proyectos...</Text>
          </View>
        ) : proyectos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="work-off" size={50} color="#90A4AE" />
            <Text style={styles.emptyText}>No tienes proyectos asignados</Text>
          </View>
        ) : (
          <FlatList
            data={proyectos}
            keyExtractor={(item) => item.id}
            renderItem={renderProyectoCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    opacity: 0.9,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nombre: {
    fontWeight: '700',
    fontSize: 18,
    color: '#0D47A1',
    marginLeft: 10,
  },
  descripcion: {
    color: '#546E7A',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB',
    paddingTop: 12,
  },
  estado: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#0D47A1',
    fontSize: 12,
    fontWeight: '600',
  },
  verTareasButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verTareasText: {
    color: '#0D47A1',
    fontWeight: '600',
    marginRight: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#0D47A1',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#90A4AE',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default HomeMiembro; 