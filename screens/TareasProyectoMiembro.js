import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  BackHandler
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';

const TareasProyectoMiembro = ({ route, navigation }) => {
  const { proyectoId, userId } = route.params;
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerTareasAsignadas();

    // Configurar el comportamiento del botón de retroceso físico
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack(); // Navegación normal hacia atrás
      return true; // Previene el comportamiento por defecto
    });

    return () => backHandler.remove();
  }, [navigation]);

  const obtenerTareasAsignadas = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'tareas'),
        where('proyectoId', '==', proyectoId),
        where('miembros', 'array-contains', userId)
      );
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        avance: doc.data().avance || 0
      }));
      setTareas(datos);
    } catch (error) {
      console.error('Error al obtener tareas asignadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="assignment" size={60} color="#CFD8DC" />
      <Text style={styles.emptyTitle}>No hay tareas</Text>
      <Text style={styles.emptySubtitle}>No tienes tareas asignadas en este proyecto</Text>
    </View>
  );

  const renderTaskCard = ({ item }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => {
        console.log('[NAV] -> SubtareasMiembro', { tareaId: item.id, userId, proyectoId });
        navigation.navigate('SubtareasMiembro', { tareaId: item.id, userId, proyectoId });
      }}
    >

      <View style={styles.taskHeader}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="assignment" size={18} color="#3A7BD5" />
        </View>
        <Text style={styles.taskName} numberOfLines={1}>
          {item.nombre || 'Tarea sin nombre'}
        </Text>
        <MaterialIcons name="chevron-right" size={24} color="#3A7BD5" />
      </View>

      <Text style={styles.taskDescription} numberOfLines={2}>
        {item.descripcion || 'Sin descripción disponible'}
      </Text>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>{item.avance}% completado</Text>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${item.avance}%`,
                backgroundColor: item.avance === 100 ? '#2E7D32' : '#3A7BD5'
              }
            ]}
          />
        </View>
      </View>

      <View style={styles.taskFooter}>
        <View style={styles.taskInfo}>
          <MaterialIcons name="event" size={16} color="#7F8C8D" />
          <Text style={styles.taskDate}>
            {item.fechaEntrega ? new Date(item.fechaEntrega).toLocaleDateString() : 'Sin fecha'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.estado === 'Completado' ? '#E8F5E9' :
                item.estado === 'En pausa' ? '#FFF8E1' : '#E3F2FD'
            }
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.estado === 'Completado' ? '#2E7D32' :
                  item.estado === 'En pausa' ? '#F57F17' : '#1565C0'
              }
            ]}
          >
            {item.estado || 'En progreso'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tareas del Proyecto</Text>

        {/* Botón de actualizar */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={obtenerTareasAsignadas}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3A7BD5" />
          <Text style={styles.loadingText}>Cargando tus tareas...</Text>
        </View>
      ) : (
        <FlatList
          data={tareas}
          keyExtractor={item => item.id}
          renderItem={renderTaskCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
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
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: 8,
    padding: 6,
    marginRight: 12,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
    color: '#78909C',
    marginBottom: 4,
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#ECEFF1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 123, 213, 0.1)',
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDate: {
    fontSize: 12,
    color: '#78909C',
    marginLeft: 6,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TareasProyectoMiembro;