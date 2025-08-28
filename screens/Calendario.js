import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  StatusBar,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
  Platform,
  BackHandler
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { db } from '../firebaseConfig';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const Calendario = ({ navigation }) => {
  const [markedDates, setMarkedDates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    obtenerProyectos();
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => backHandler.remove();
  }, []);

  const obtenerProyectos = async () => {
    try {
      setRefreshing(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.log('Usuario no autenticado');
        return;
      }

      const q = query(collection(db, 'proyectos'), where('creadorId', '==', user.uid));
      const snapshot = await getDocs(q);
      const proyectosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setAllProjects(proyectosData);

      let dates = {};
      proyectosData.forEach(proyecto => {
        if (proyecto.fechaEntrega) {
          const fechaEntrega = new Date(proyecto.fechaEntrega).toISOString().split('T')[0];
          
          dates[fechaEntrega] = {
            selected: true,
            marked: true,
            selectedColor: '#3A7BD5',
            dotColor: '#FFFFFF',
            customStyles: {
              container: {
                backgroundColor: '#3A7BD5',
                borderRadius: 16,
              },
              text: {
                color: 'white',
                fontWeight: 'bold',
              }
            }
          };
        }
      });
      
      setMarkedDates(dates);
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onDayPress = (day) => {
    const fecha = day.dateString;
    const proyectosDelDia = allProjects.filter(proyecto => {
      if (proyecto.fechaEntrega) {
        const proyectoFecha = new Date(proyecto.fechaEntrega).toISOString().split('T')[0];
        return proyectoFecha === fecha;
      }
      return false;
    });

    if (proyectosDelDia.length > 0) {
      setSelectedDate(fecha);
      setSelectedProjects(proyectosDelDia);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getProgressColor = (avance) => {
    if (avance >= 100) return '#4CAF50';
    if (avance >= 75) return '#8BC34A';
    if (avance >= 50) return '#FFC107';
    if (avance >= 25) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      
      {/* Header */}
      <LinearGradient 
        colors={['#3A7BD5', '#2980b9']} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Calendario</Text>
          <Text style={styles.headerSubtitle}>Fechas de entrega</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={obtenerProyectos}
        >
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Content */}
      <Animated.View 
        style={[styles.content, { opacity: fadeAnim }]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3A7BD5" />
            <Text style={styles.loadingText}>Cargando calendario...</Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={obtenerProyectos}
                colors={['#3A7BD5']}
                tintColor="#3A7BD5"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Proyectos Programados</Text>
            
            <Calendar
              markedDates={markedDates}
              onDayPress={onDayPress}
              markingType={'custom'}
              theme={{
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#3A7BD5',
                selectedDayBackgroundColor: '#3A7BD5',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#3A7BD5',
                dayTextColor: '#2C3E50',
                textDisabledColor: '#d9e1e8',
                dotColor: '#3A7BD5',
                selectedDotColor: '#FFFFFF',
                arrowColor: '#3A7BD5',
                monthTextColor: '#3A7BD5',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 12,
              }}
              style={styles.calendar}
            />

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3A7BD5' }]} />
                <Text style={styles.legendText}>Fecha de entrega</Text>
              </View>
            </View>

            {Object.keys(markedDates).length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Icon name="event-busy" size={60} color="#CFD8DC" />
                <Text style={styles.emptyTitle}>No hay proyectos programados</Text>
                <Text style={styles.emptySubtitle}>
                  Los proyectos con fechas de entrega aparecerán aquí
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* Modal de Detalles */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Proyectos para {selectedDate && formatDate(selectedDate)}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeIcon}>
                <Icon name="close" size={24} color="#3A7BD5" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedProjects.length > 0 ? (
                selectedProjects.map((proyecto, index) => (
                  <View key={proyecto.id} style={styles.projectCard}>
                    <View style={styles.projectHeader}>
                      <Text style={styles.projectName}>{proyecto.nombre}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getProgressColor(proyecto.avance || 0) }
                      ]}>
                        <Text style={styles.statusText}>{proyecto.avance || 0}%</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.projectDescription} numberOfLines={2}>
                      {proyecto.descripcion}
                    </Text>
                    
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBackground}>
                        <View 
                          style={[
                            styles.progressBar, 
                            { 
                              width: `${Math.max(0, Math.min(100, proyecto.avance || 0))}%`,
                              backgroundColor: getProgressColor(proyecto.avance || 0)
                            }
                          ]} 
                        />
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.viewProjectButton}
                      onPress={() => {
                        closeModal();
                        navigation.navigate('TareasProyecto', {
                          proyectoId: proyecto.id,
                          userId: getAuth().currentUser.uid
                        });
                      }}
                    >
                      <Text style={styles.viewProjectText}>Ver Proyecto</Text>
                      <Icon name="arrow-forward" size={16} color="#3A7BD5" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.noProjectsContainer}>
                  <Icon name="work-off" size={40} color="#CFD8DC" />
                  <Text style={styles.noProjectsText}>No hay proyectos para esta fecha</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <LinearGradient
                colors={['#3A7BD5', '#00D2FF']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F5FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#78909C',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
    marginLeft: 4,
  },
  calendar: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#90A4AE',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  closeIcon: {
    padding: 4,
  },
  modalContent: {
    maxHeight: '70%',
    padding: 20,
  },
  projectCard: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EFF5',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  projectDescription: {
    fontSize: 14,
    color: '#5A6B7C',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#ECEFF1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  viewProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: 10,
  },
  viewProjectText: {
    color: '#3A7BD5',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 6,
  },
  noProjectsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noProjectsText: {
    fontSize: 16,
    color: '#90A4AE',
    marginTop: 12,
    fontWeight: '500',
  },
  closeButton: {
    borderRadius: 12,
    margin: 20,
    overflow: 'hidden',
  },
  gradientButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default Calendario;