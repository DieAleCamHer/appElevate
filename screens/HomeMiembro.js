import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
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
        colors={['#FFFFFF', '#F5F9FF']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="work" size={20} color="#3A7BD5" />
          </View>
          <Text style={styles.nombre} numberOfLines={1} ellipsizeMode="tail">{item.nombre}</Text>
        </View>
        
        <Text style={styles.descripcion} numberOfLines={2} ellipsizeMode="tail">
          {item.descripcion || 'Sin descripción'}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={[styles.estadoContainer, { 
            backgroundColor: item.estado === 'Completado' ? '#E8F5E9' : 
                           item.estado === 'En pausa' ? '#FFF8E1' : '#E3F2FD'
          }]}>
            <Text style={[styles.estado, {
              color: item.estado === 'Completado' ? '#2E7D32' : 
                     item.estado === 'En pausa' ? '#F57F17' : '#1565C0'
            }]}>
              {item.estado || 'En progreso'}
            </Text>
          </View>
          <View style={styles.verTareasButton}>
            <Text style={styles.verTareasText}>Ver tareas</Text>
            <MaterialIcons name="chevron-right" size={20} color="#3A7BD5" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      
      <LinearGradient
        colors={['#3A7BD5', '#00D2FF']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Mis Proyectos</Text>
        <Text style={styles.subtitle}>
          {proyectos.length === 0 ? 'No tienes proyectos asignados' : 
           proyectos.length === 1 ? '1 proyecto asignado' : 
           `${proyectos.length} proyectos asignados`}
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3A7BD5" />
          <Text style={styles.loadingText}>Cargando tus proyectos...</Text>
        </View>
      ) : (
        <FlatList
          data={proyectos}
          keyExtractor={(item) => item.id}
          renderItem={renderProyectoCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="work-outline" size={60} color="#CFD8DC" />
              <Text style={styles.emptyTitle}>No hay proyectos</Text>
              <Text style={styles.emptySubtitle}>No tienes proyectos asignados actualmente</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  header: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  card: {
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardGradient: {
    borderRadius: 14,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: 10,
    padding: 8,
    marginRight: 12,
  },
  nombre: {
    fontWeight: '600',
    fontSize: 17,
    color: '#2C3E50',
    flex: 1,
  },
  descripcion: {
    color: '#7F8C8D',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 123, 213, 0.1)',
  },
  estadoContainer: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  estado: {
    fontSize: 12,
    fontWeight: '600',
  },
  verTareasButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verTareasText: {
    color: '#3A7BD5',
    fontWeight: '500',
    marginRight: 6,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#3A7BD5',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#90A4AE',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#B0BEC5',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default HomeMiembro;