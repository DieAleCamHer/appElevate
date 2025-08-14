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
  const { proyectoId } = route.params;
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
        <Icon name="history" size={20} color="#7C4DFF" />
        <Text style={styles.cardTitle}>Registro de cambio</Text>
      </View>
      
      <View style={styles.detailRow}>
        <Icon name="person" size={16} color="#555" style={styles.icon} />
        <Text style={styles.detailText}>
          {item.usuarioNombre || 'Sin nombre'} ({item.usuarioUsername || 'Sin usuario'})
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Icon name="info" size={16} color="#555" style={styles.icon} />
        <Text style={styles.detailText}>
          Estado: <Text style={styles.highlight}>{item.estadoNuevo || 'Sin estado'}</Text>
        </Text>
      </View>
      
      {item.comentario && (
        <View style={styles.detailRow}>
          <Icon name="comment" size={16} color="#555" style={styles.icon} />
          <Text style={styles.detailText}>{item.comentario}</Text>
        </View>
      )}
      
      <View style={styles.detailRow}>
        <Icon name="access-time" size={16} color="#555" style={styles.icon} />
        <Text style={styles.dateText}>{item.fechaFormateada}</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📜 Historial de Cambios</Text>
          <Text style={styles.subtitle}>Proyecto ID: {proyectoId}</Text>
        </View>

        <View style={styles.filterContainer}>
          <View style={styles.inputContainer}>
            <Icon name="search" size={20} color="#555" style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Buscar por usuario"
              placeholderTextColor="#888"
              value={filtroUsuario}
              onChangeText={setFiltroUsuario}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="filter-list" size={20} color="#555" style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Filtrar por estado"
              placeholderTextColor="#888"
              value={filtroEstado}
              onChangeText={setFiltroEstado}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={obtenerHistorial}
          disabled={loading}
        >
          <Icon name="refresh" size={20} color="#FFF" />
          <Text style={styles.refreshText}>Actualizar</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#7C4DFF" style={styles.loader} />
        ) : historialFiltrado.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="info-outline" size={50} color="#888" />
            <Text style={styles.emptyText}>No hay registros que coincidan</Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00796B',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#546E7A',
  },
  filterContainer: {
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 10,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 45,
    paddingLeft: 10,
    color: '#333',
  },
  searchIcon: {
    marginRight: 5,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C4DFF',
    borderRadius: 25,
    padding: 12,
    marginBottom: 20,
    elevation: 3,
  },
  refreshText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7C4DFF',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  highlight: {
    color: '#00796B',
    fontWeight: 'bold',
  },
  dateText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 40,
  },
});

export default HistorialProyecto;