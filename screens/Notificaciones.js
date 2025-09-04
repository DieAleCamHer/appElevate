import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const Notificaciones = ({ navigation }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Obtener notificaciones del usuario actual
  const obtenerNotificaciones = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'notificaciones'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notifs = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({ 
          id: doc.id, 
          ...data,
          // Asegurar que la fecha se convierta correctamente
          date: data.date ? data.date.toDate() : new Date()
        });
      });
      
      setNotificaciones(notifs);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Marcar notificación como leída
  const marcarComoLeida = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notificaciones', notifId), {
        seen: true
      });
      // Actualizar lista local
      setNotificaciones(prev => 
        prev.map(n => n.id === notifId ? {...n, seen: true} : n)
      );
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'notificaciones'),
        where('userId', '==', user.uid),
        where('seen', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = [];
      
      querySnapshot.forEach((doc) => {
        batch.push(updateDoc(doc.ref, { seen: true }));
      });
      
      // Ejecutar todas las actualizaciones
      await Promise.all(batch);
      
      // Actualizar estado local
      setNotificaciones(prev => 
        prev.map(n => ({ ...n, seen: true }))
      );
      
      Alert.alert('Éxito', 'Todas las notificaciones se marcaron como leídas');
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      Alert.alert('Error', 'No se pudieron marcar todas como leídas');
    }
  };

  // Eliminar notificación
  const eliminarNotificacion = async (notifId) => {
    try {
      await deleteDoc(doc(db, 'notificaciones', notifId));
      setNotificaciones(prev => prev.filter(n => n.id !== notifId));
      setModalVisible(false);
      Alert.alert('Éxito', 'Notificación eliminada');
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      Alert.alert('Error', 'No se pudo eliminar la notificación');
    }
  };

  // Eliminar todas las notificaciones
  const eliminarTodas = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'notificaciones'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = [];
      
      querySnapshot.forEach((doc) => {
        batch.push(deleteDoc(doc.ref));
      });
      
      // Ejecutar todas las eliminaciones
      await Promise.all(batch);
      
      // Actualizar estado local
      setNotificaciones([]);
      
      Alert.alert('Éxito', 'Todas las notificaciones fueron eliminadas');
    } catch (error) {
      console.error('Error al eliminar todas las notificaciones:', error);
      Alert.alert('Error', 'No se pudieron eliminar todas las notificaciones');
    }
  };

  // Abrir detalles de la notificación
  const abrirDetalles = (notif) => {
    setSelectedNotification(notif);
    if (!notif.seen) {
      marcarComoLeida(notif.id);
    }
    setModalVisible(true);
  };

  // Función para ir al historial
  const irAlHistorial = (notif) => {
    if (!notif?.proyectoId) {
      Alert.alert('Sin proyecto', 'Esta notificación no tiene proyecto asociado.');
      return;
    }
    setModalVisible(false);
    navigation.navigate('HistorialProyecto', { proyectoId: notif.proyectoId });
  };

  // Refrescar manualmente
  const onRefresh = () => {
    setRefreshing(true);
    obtenerNotificaciones();
  };

  useEffect(() => {
    obtenerNotificaciones();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3A7BD5" />
        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      
      <LinearGradient
        colors={['#3A7BD5', '#00D2FF']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notificaciones</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={marcarTodasComoLeidas} style={styles.headerIconButton}>
            <MaterialIcons name="drafts" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onRefresh} style={styles.headerIconButton}>
            <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {notificaciones.length > 0 && (
        <TouchableOpacity 
          style={styles.clearAllButton}
          onPress={() => {
            Alert.alert(
              "Eliminar todas",
              "¿Estás seguro de que quieres eliminar todas las notificaciones?",
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Eliminar", onPress: eliminarTodas, style: "destructive" }
              ]
            );
          }}
        >
          <Text style={styles.clearAllText}>Eliminar todas</Text>
          <MaterialIcons name="delete-sweep" size={20} color="#F44336" />
        </TouchableOpacity>
      )}

      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={notificaciones.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-off" size={60} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
            <Text style={styles.emptySubtitle}>Las notificaciones aparecerán aquí</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => item.proyectoId ? irAlHistorial(item) : abrirDetalles(item)}
            style={[styles.notificationItem, !item.seen && styles.unreadItem]}
          >
            <View style={styles.notificationIcon}>
              <MaterialIcons 
                name={item.type === 'subtarea_estado' ? 'assignment' : 'notifications'} 
                size={24} 
                color={!item.seen ? '#3A7BD5' : '#78909C'} 
              />
              {!item.seen && <View style={styles.unreadDot} />}
            </View>
            
            <View style={styles.notificationContent}>
              <Text style={[styles.notificationMessage, !item.seen && styles.unreadMessage]}>
                {item.message}
              </Text>
              <Text style={styles.notificationDate}>
                {item.date ? item.date.toLocaleDateString('es-ES', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                }) : 'Fecha no disponible'}
              </Text>
              
              {item.estado && (
                <View style={[styles.statusBadge, { backgroundColor: getEstadoColor(item.estado) + '20' }]}>
                  <Text style={[styles.statusText, { color: getEstadoColor(item.estado) }]}>
                    {item.estado}
                  </Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              onPress={() => eliminarNotificacion(item.id)}
              style={styles.deleteButton}
            >
              <MaterialIcons name="close" size={20} color="#B0BEC5" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* Modal de detalles de notificación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalles de notificación</Text>
            
            {selectedNotification && (
              <>
                <View style={styles.modalIcon}>
                  <MaterialIcons 
                    name={selectedNotification.type === 'subtarea_estado' ? 'assignment' : 'notifications'} 
                    size={36} 
                    color="#3A7BD5" 
                  />
                </View>
                
                <Text style={styles.modalMessage}>{selectedNotification.message}</Text>
                
                <Text style={styles.modalDate}>
                  {selectedNotification.date ? selectedNotification.date.toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  }) : 'Fecha no disponible'}
                </Text>
                
                <View style={styles.modalActions}>
                  {/* Botón para ir al historial si tiene proyectoId */}
                  {selectedNotification.proyectoId && (
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => irAlHistorial(selectedNotification)}
                    >
                      <LinearGradient
                        colors={['#3A7BD5', '#00D2FF']}
                        style={styles.modalGradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.modalButtonText}>Ir al historial</Text>
                        <MaterialIcons name="open-in-new" size={18} color="#FFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButtonModal]}
                    onPress={() => {
                      Alert.alert(
                        "Eliminar notificación",
                        "¿Estás seguro de que quieres eliminar esta notificación?",
                        [
                          { text: "Cancelar", style: "cancel" },
                          { text: "Eliminar", onPress: () => eliminarNotificacion(selectedNotification.id), style: "destructive" }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Eliminar</Text>
                    <MaterialIcons name="delete" size={18} color="#F44336" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButtonModal]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Función auxiliar para colores de estado (debe coincidir con la de SubtareasMiembro)
const getEstadoColor = (estado) => {
  switch (estado) {
    case 'Pendiente': return '#FFA000';
    case 'En progreso': return '#2196F3';
    case 'Finalizado': return '#4CAF50';
    case 'Entrega tardía': return '#F44336';
    default: return '#9E9E9E';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clearAllText: {
    color: '#F44336',
    fontWeight: '600',
    marginRight: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3A7BD5',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#90A4AE',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#B0BEC5',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 14,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(58, 123, 213, 0.04)',
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#3A7BD5',
  },
  notificationIcon: {
    marginRight: 12,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3A7BD5',
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
    marginBottom: 6,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  notificationDate: {
    fontSize: 12,
    color: '#78909C',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 14,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 15,
    color: '#37474F',
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDate: {
    fontSize: 14,
    color: '#78909C',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    marginTop: 16,
  },
  modalButton: {
    marginVertical: 8,
  },
  modalGradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
    marginRight: 8,
  },
  deleteButtonModal: {
    borderWidth: 1.2,
    borderColor: '#F44336',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
    fontWeight: '700',
    fontSize: 14,
    marginRight: 8,
  },
  cancelButtonModal: {
    backgroundColor: '#F1F4F8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#607D8B',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default Notificaciones;