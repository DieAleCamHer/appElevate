import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TareasProyectoMiembro = ({ route, navigation }) => {
  const { proyectoId, userId } = route.params;
  const [tareas, setTareas] = useState([]);

  // Animaciones
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      })
    ]).start();

    obtenerTareasAsignadas();
  }, []);

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

  return (
    <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#00796B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Tareas Asignadas</Text>
      </Animated.View>

      <Animated.View style={[styles.tasksContainer, { opacity: fadeAnim }]}>
        {tareas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="assignment" size={50} color="#90A4AE" />
            <Text style={styles.emptyText}>No tienes tareas asignadas</Text>
          </View>
        ) : (
          <FlatList
            data={tareas}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.taskCard}
                onPress={() =>
                  navigation.navigate('SubtareasMiembro', {
                    tareaId: item.id,
                    userId,
                    proyectoId,
                  })
                }
              >
                <View style={styles.taskHeader}>
                  <Text style={styles.taskName}>{item.nombre}</Text>
                  <Icon name="chevron-right" size={24} color="#00796B" />
                </View>
                
                <Text style={styles.taskDescription}>{item.descripcion}</Text>
                
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${item.avance ?? 0}%` }]} />
                  <Text style={styles.progressText}>{item.avance ?? 0}% completado</Text>
                </View>
                
                <View style={styles.taskFooter}>
                  <View style={styles.taskInfo}>
                    <Icon name="event" size={16} color="#7C4DFF" />
                    <Text style={styles.taskDate}>
                      {item.fechaEntrega ? new Date(item.fechaEntrega).toLocaleDateString() : 'Sin fecha'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00796B',
    flex: 1,
  },
  tasksContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#90A4AE',
    marginTop: 10,
  },
  taskCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    color: '#546E7A',
    marginBottom: 15,
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#ECEFF1',
    borderRadius: 5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7C4DFF',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'right',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDate: {
    fontSize: 12,
    color: '#78909C',
    marginLeft: 5,
  },
});

export default TareasProyectoMiembro; 