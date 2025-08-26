import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, 
  ActivityIndicator, SafeAreaView, Alert, BackHandler 
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const HomeMiembro = ({ route, navigation }) => {
  const { userId } = route.params;
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    obtenerProyectosAsignados();

    // Configurar el comportamiento del botón de retroceso físico
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => backHandler.remove();
  }, []);

  const handleBackPress = () => {
    mostrarConfirmacionCerrarSesion();
    return true; // Previene la acción por defecto
  };

  const mostrarConfirmacionCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Quieres cerrar tu sesión como miembro?',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Sí, cerrar sesión',
          style: 'destructive',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  const obtenerProyectosAsignados = async () => {
    try {
      setRefreshing(true);
      const q = query(collection(db, 'proyectos'), where('miembros', 'array-contains', userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProyectos(data);
    } catch (error) {
      console.error('Error al obtener proyectos asignados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderProyectoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TareasProyectoMiembro', {
        proyectoId: item.id,
        userId
      })}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFF']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getEstadoColor(item.estado) + '20' }]}>
            <MaterialIcons name="work" size={20} color={getEstadoColor(item.estado)} />
          </View>
          <Text style={styles.nombre} numberOfLines={1} ellipsizeMode="tail">{item.nombre}</Text>
        </View>
        
        <Text style={styles.descripcion} numberOfLines={2} ellipsizeMode="tail">
          {item.descripcion || 'Sin descripción'}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={[styles.estadoContainer, { 
            backgroundColor: getEstadoColor(item.estado) + '20'
          }]}>
            <Text style={[styles.estado, {
              color: getEstadoColor(item.estado)
            }]}>
              {item.estado || 'En progreso'}
            </Text>
          </View>
          <View style={styles.verTareasButton}>
            <Text style={styles.verTareasText}>Ver tareas</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#3A7BD5" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Completado': return '#4CAF50';
      case 'En pausa': return '#FF9800';
      case 'Cancelado': return '#F44336';
      default: return '#2196F3';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        
        {/* Header Mejorado */}
        <LinearGradient
          colors={['#3A7BD5', '#00D2FF']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={mostrarConfirmacionCerrarSesion}
              >
                <MaterialIcons name="exit-to-app" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={obtenerProyectosAsignados}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.headerBottom}>
              <View>
                <Text style={styles.title}>Mis Proyectos</Text>
                <Text style={styles.subtitle}>
                  {proyectos.length === 0 ? 'No tienes proyectos asignados' : 
                   proyectos.length === 1 ? '1 proyecto asignado' : 
                   `${proyectos.length} proyectos asignados`}
                </Text>
              </View>
              
              <View style={styles.headerIcon}>
                <MaterialIcons name="work" size={28} color="#FFFFFF" />
              </View>
            </View>
          </View>
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
            refreshing={refreshing}
            onRefresh={obtenerProyectosAsignados}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="work-outline" size={64} color="#CFD8DC" />
                <Text style={styles.emptyTitle}>No hay proyectos</Text>
                <Text style={styles.emptySubtitle}>No tienes proyectos asignados actualmente</Text>
                <TouchableOpacity 
                  style={styles.refreshEmptyButton}
                  onPress={obtenerProyectosAsignados}
                >
                  <Text style={styles.refreshEmptyText}>Actualizar</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#FFFFFF',
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
  iconContainer: {
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    fontWeight: '700',
    fontSize: 18,
    color: '#2C3E50',
    flex: 1,
  },
  descripcion: {
    color: '#5A6B7C',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 123, 213, 0.1)',
  },
  estadoContainer: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  estado: {
    fontSize: 13,
    fontWeight: '700',
  },
  verTareasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  verTareasText: {
    color: '#3A7BD5',
    fontWeight: '600',
    marginRight: 6,
    fontSize: 13,
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
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#90A4AE',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#B0BEC5',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    marginBottom: 20,
  },
  refreshEmptyButton: {
    backgroundColor: '#3A7BD5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshEmptyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default HomeMiembro;