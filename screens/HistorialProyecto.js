import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const HistorialProyecto = ({ route }) => {
  const { proyectoId, proyectoNombre } = route.params;
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const obtenerHistorial = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'historial'),
        where('proyectoId', '==', proyectoId),
        orderBy('fechaCambio', 'desc')
      );
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        fechaFormateada: new Date(doc.data().fechaCambio?.seconds * 1000).toLocaleString()
      }));
      setHistorial(datos);
    } catch (error) {
      console.error('Error al obtener historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const historialFiltrado = historial.filter(item => {
    const matchUsuario = filtroUsuario === '' || 
      (item.usuarioUsername && item.usuarioUsername.toLowerCase().includes(filtroUsuario.toLowerCase()));
    const matchEstado = filtroEstado === '' || 
      (item.estadoNuevo && item.estadoNuevo.toLowerCase().includes(filtroEstado.toLowerCase()));
    return matchUsuario && matchEstado;
  });

  useEffect(() => {
    obtenerHistorial();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Icon name="history" size={20} color="#FFF" />
        </View>
        <View>
          <Text style={styles.cardTitle}>Cambio en tarea</Text>
          <Text style={styles.cardSubtitle}>{item.fechaFormateada}</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.detailSection}>
        {item.tareaNombre && (
          <View style={styles.detailRow}>
            <Icon name="assignment" size={16} color="#555" style={styles.icon} />
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Tarea: </Text>
              <Text style={styles.taskName}>{item.tareaNombre}</Text>
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Icon name="person" size={16} color="#555" style={styles.icon} />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Usuario: </Text>
            {item.usuarioNombre || 'Sin nombre'} ({item.usuarioUsername || 'Sin usuario'})
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="info" size={16} color="#555" style={styles.icon} />
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Estado: </Text>
            <Text style={[styles.statusText, getStatusStyle(item.estadoNuevo)]}>
              {item.estadoNuevo || 'Sin estado'}
            </Text>
          </Text>
        </View>
        
        {item.comentario && (
          <View style={styles.detailRow}>
            <Icon name="comment" size={16} color="#555" style={styles.icon} />
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Comentario: </Text>
              {item.comentario}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const getStatusStyle = (status) => {
    if (!status) return {};
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus.includes('complet') || lowerStatus.includes('finaliz')) {
      return styles.statusCompleted;
    }
    if (lowerStatus.includes('progreso') || lowerStatus.includes('proceso')) {
      return styles.statusInProgress;
    }
    if (lowerStatus.includes('pendiente') || lowerStatus.includes('espera')) {
      return styles.statusPending;
    }
    if (lowerStatus.includes('cancel') || lowerStatus.includes('rechaz')) {
      return styles.statusCancelled;
    }
    return {};
  };

  return (
    <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Historial de Cambios</Text>
          <Text style={styles.projectName}>{proyectoNombre}</Text>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Buscar por usuario"
                placeholderTextColor="#888"
                value={filtroUsuario}
                onChangeText={setFiltroUsuario}
              />
              <Icon name="search" size={20} color="#555" style={styles.inputIcon} />
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Filtrar por estado"
                placeholderTextColor="#888"
                value={filtroEstado}
                onChangeText={setFiltroEstado}
              />
              <Icon name="filter-list" size={20} color="#555" style={styles.inputIcon} />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={obtenerHistorial}
            disabled={loading}
          >
            <Icon name="refresh" size={20} color="#FFF" />
            <Text style={styles.refreshText}>{loading ? 'Cargando...' : 'Actualizar'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00796B" style={styles.loader} />
        ) : historialFiltrado.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="info-outline" size={50} color="#888" />
            <Text style={styles.emptyText}>No se encontraron registros</Text>
            <Text style={styles.emptySubtext}>Intenta ajustar los filtros</Text>
          </View>
        ) : (
          <FlatList
            data={historialFiltrado}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 107, 0.2)',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#00796B',
    textAlign: 'center',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 16,
    color: '#00897B',
    textAlign: 'center',
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    height: 42,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#333',
    fontSize: 14,
  },
  inputIcon: {
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00796B',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
  },
  refreshText: {
    color: '#FFF',
    fontWeight: '500',
    marginLeft: 8,
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    backgroundColor: '#00796B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00796B',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  detailSection: {
    paddingTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
    color: '#00796B',
  },
  detailLabel: {
    fontWeight: '500',
    color: '#424242',
  },
  detailText: {
    flex: 1,
    color: '#616161',
    fontSize: 14,
    lineHeight: 20,
  },
  taskName: {
    fontWeight: '600',
    color: '#00796B',
  },
  statusText: {
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  statusInProgress: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  },
  statusPending: {
    backgroundColor: '#FFF8E1',
    color: '#FF8F00',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 20,
    elevation: 1,
  },
  emptyText: {
    marginTop: 16,
    color: '#424242',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#757575',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  loader: {
    marginVertical: 40,
  },
});

export default HistorialProyecto;