import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  BackHandler,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const HistorialProyecto = ({ route, navigation }) => {
  const { proyectoId, proyectoNombre } = route.params;
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [estados, setEstados] = useState([]);
  const [gerenteId, setGerenteId] = useState(null);
  const [nombreProyecto, setNombreProyecto] = useState(proyectoNombre || '');

  useEffect(() => {
    console.log("Parámetros recibidos:", { proyectoId, proyectoNombre });
    obtenerGerenteProyecto();
    asegurarNombreProyecto();
    obtenerHistorial();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => backHandler.remove();
  }, [navigation, proyectoId]);

  const obtenerGerenteProyecto = async () => {
    try {
      const proyectoDoc = await getDoc(doc(db, 'proyectos', proyectoId));
      if (proyectoDoc.exists()) {
        setGerenteId(proyectoDoc.data().creadorId);
      }
    } catch (error) {
      console.error('Error al obtener gerente:', error);
    }
  };

  const asegurarNombreProyecto = async () => {
    try {
      if (nombreProyecto) return;
      const snap = await getDoc(doc(db, 'proyectos', proyectoId));
      if (snap.exists()) {
        const n = snap.data()?.nombre || 'Proyecto';
        setNombreProyecto(n);
      } else {
        setNombreProyecto('Proyecto');
      }
    } catch (e) {
      setNombreProyecto('Proyecto');
    }
  };

  const obtenerHistorial = async () => {
    try {
      setLoading(true);
      console.log("Buscando historial para proyecto:", proyectoId);

      const q = query(
        collection(db, 'historial'),
        where('proyectoId', '==', proyectoId),
        orderBy('fechaCambio', 'desc')
      );

      const snapshot = await getDocs(q);
      console.log("Número de documentos encontrados:", snapshot.size);

      if (snapshot.empty) {
        console.log("No se encontraron documentos en el historial");
        setHistorial([]);
        setLoading(false);
        return;
      }

      const datos = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Documento:", doc.id, data);

        let fechaFormateada = 'Fecha no disponible';

        // MANEJO DE DIFERENTES FORMATOS DE FECHA
        if (data.fechaCambio) {
          try {
            // 1. Si es Timestamp de Firestore (con seconds)
            if (data.fechaCambio.seconds !== undefined) {
              fechaFormateada = new Date(data.fechaCambio.seconds * 1000).toLocaleString('es-ES');
            } 
            // 2. Si es Timestamp de Firestore (con toDate)
            else if (data.fechaCambio.toDate && typeof data.fechaCambio.toDate === 'function') {
              fechaFormateada = data.fechaCambio.toDate().toLocaleString('es-ES');
            }
            // 3. Si es string ISO (como "2025-09-04T02:57:24.204Z")
            else if (typeof data.fechaCambio === 'string') {
              fechaFormateada = new Date(data.fechaCambio).toLocaleString('es-ES');
            }
            // 4. Si es objeto Date directamente
            else if (data.fechaCambio instanceof Date) {
              fechaFormateada = data.fechaCambio.toLocaleString('es-ES');
            }
          } catch (error) {
            console.error("Error formateando fecha:", error, data.fechaCambio);
            fechaFormateada = 'Fecha inválida';
          }
        }

        datos.push({
          id: doc.id,
          ...data,
          fechaFormateada
        });
      });

      setHistorial(datos);
      console.log("Datos procesados:", datos);

      // Extraer usuarios y estados únicos
      const usuariosUnicos = [...new Set(datos.map(item => item.usuarioUsername).filter(Boolean))];
      const estadosUnicos = [...new Set(datos.map(item => item.estadoNuevo).filter(Boolean))];

      setUsuarios(usuariosUnicos);
      setEstados(estadosUnicos);

    } catch (error) {
      console.error('Error completo al obtener historial:', error);
      Alert.alert(
        'Error',
        `No se pudieron cargar los registros: ${error.message}`,
        [{ text: 'Reintentar', onPress: obtenerHistorial }]
      );
    } finally {
      setLoading(false);
    }
  };

  const historialFiltrado = historial.filter(item => {
    const matchUsuario =
      filtroUsuario === '' || (item.usuarioUsername && item.usuarioUsername === filtroUsuario);

    const matchEstado =
      filtroEstado === '' || (item.estadoNuevo && item.estadoNuevo === filtroEstado);

    return matchUsuario && matchEstado;
  });

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: getStatusColor(item.estadoNuevo) }]}>
          <Icon name="history" size={20} color="#FFF" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>Registro de cambio</Text>
          <Text style={styles.cardSubtitle}>
            {item.fechaFormateada !== 'Fecha no disponible' 
              ? item.fechaFormateada 
              : 'Fecha no disponible'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailSection}>
        {item.tareaNombre && (
          <View style={styles.detailRow}>
            <Icon name="assignment" size={18} color="#00796B" style={styles.icon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>TAREA:</Text>
              <Text style={styles.taskName}>{item.tareaNombre}</Text>
            </View>
          </View>
        )}

        {item.subtareaNombre && (
          <View style={styles.detailRow}>
            <Icon name="list" size={18} color="#00897B" style={styles.icon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>SUBTAREA:</Text>
              <Text style={styles.subtaskName}>{item.subtareaNombre}</Text>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <Icon name="person" size={18} color="#5D4037" style={styles.icon} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>USUARIO:</Text>
            <Text style={styles.userText}>
              {item.usuarioNombre || 'Sin nombre'}
              {item.usuarioUsername && ` (@${item.usuarioUsername})`}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Icon name="flag" size={18} color={getStatusColor(item.estadoNuevo)} style={styles.icon} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>ESTADO:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estadoNuevo) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.estadoNuevo) }]}>
                {item.estadoNuevo || 'Sin estado'}
              </Text>
            </View>
          </View>
        </View>

        {item.comentario && (
          <View style={styles.detailRow}>
            <Icon name="comment" size={18} color="#7B1FA2" style={styles.icon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>COMENTARIO:</Text>
              <Text style={styles.commentText}>{item.comentario}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.includes('complet') || lowerStatus.includes('finaliz')) return '#4CAF50';
    if (lowerStatus.includes('progreso') || lowerStatus.includes('proceso')) return '#2196F3';
    if (lowerStatus.includes('pendiente') || lowerStatus.includes('espera')) return '#FF9800';
    if (lowerStatus.includes('cancel') || lowerStatus.includes('rechaz')) return '#F44336';
    if (lowerStatus.includes('tard')) return '#FF5722';
    return '#9E9E9E';
  };

  const FilterModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentFilter === 'usuario' ? 'Filtrar por Usuario' : 'Filtrar por Estado'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#00796B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => {
                currentFilter === 'usuario' ? setFiltroUsuario('') : setFiltroEstado('');
                setModalVisible(false);
              }}
            >
              <Text style={styles.filterOptionText}>Todos</Text>
              <Icon name="check" size={20} color="#00796B"
                style={{
                  opacity: (currentFilter === 'usuario' && filtroUsuario === '') ||
                    (currentFilter === 'estado' && filtroEstado === '') ? 1 : 0
                }}
              />
            </TouchableOpacity>

            {(currentFilter === 'usuario' ? usuarios : estados).map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.filterOption}
                onPress={() => {
                  currentFilter === 'usuario' ? setFiltroUsuario(item) : setFiltroEstado(item);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.filterOptionText}>{item}</Text>
                <Icon name="check" size={20} color="#00796B"
                  style={{
                    opacity: (currentFilter === 'usuario' && filtroUsuario === item) ||
                      (currentFilter === 'estado' && filtroEstado === item) ? 1 : 0
                  }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#E3F2FD', '#BBDEFB', '#90CAF9']} style={styles.background}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>Historial de Cambios</Text>
            <Text style={styles.projectName}>{nombreProyecto || 'Proyecto'}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.filterSection}>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterButton, filtroUsuario && styles.filterButtonActive]}
                onPress={() => {
                  setCurrentFilter('usuario');
                  setModalVisible(true);
                }}
              >
                <Icon name="person" size={18} color={filtroUsuario ? "#FFF" : "#00796B"} />
                <Text style={[styles.filterButtonText, filtroUsuario && styles.filterButtonTextActive]}>
                  {filtroUsuario || 'Usuario'}
                </Text>
                {filtroUsuario && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setFiltroUsuario('');
                    }}
                    style={styles.clearFilter}
                  >
                    <Icon name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, filtroEstado && styles.filterButtonActive]}
                onPress={() => {
                  setCurrentFilter('estado');
                  setModalVisible(true);
                }}
              >
                <Icon name="flag" size={18} color={filtroEstado ? "#FFF" : "#00796B"} />
                <Text style={[styles.filterButtonText, filtroEstado && styles.filterButtonTextActive]}>
                  {filtroEstado || 'Estado'}
                </Text>
                {filtroEstado && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setFiltroEstado('');
                    }}
                    style={styles.clearFilter}
                  >
                    <Icon name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.filterFooter}>
              <Text style={styles.counterText}>
                {historialFiltrado.length} de {historial.length} registros
              </Text>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={obtenerHistorial}
                disabled={loading}
              >
                <Icon name="refresh" size={20} color="#FFF" />
                <Text style={styles.refreshText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#00796B" style={styles.loader} />
          ) : historialFiltrado.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="search-off" size={50} color="#90A4AE" />
              <Text style={styles.emptyText}>No se encontraron registros</Text>
              <Text style={styles.emptySubtext}>
                {filtroUsuario || filtroEstado ?
                  'Intenta con otros filtros' :
                  'No hay historial para este proyecto'
                }
              </Text>
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

        <FilterModal />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 40,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  backButton: {
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  projectName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  container: {
    padding: 12,
    paddingBottom: 20,
  },
  filterSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BBDEFB',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#00796B',
    borderColor: '#00796B',
  },
  filterButtonText: {
    color: '#00796B',
    fontWeight: '600',
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  clearFilter: {
    padding: 2,
  },
  filterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    color: '#616161',
    fontSize: 13,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00796B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  refreshText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  listContainer: {
    paddingBottom: 6,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00796B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  detailSection: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#616161',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  taskName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00796B',
    lineHeight: 18,
  },
  subtaskName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00897B',
    lineHeight: 18,
  },
  userText: {
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
    gap: 5,
  },
  fileText: {
    fontSize: 12,
    color: '#00796B',
    fontWeight: '500',
  },
  commentText: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 18,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
    marginTop: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 16,
    elevation: 2,
  },
  emptyText: {
    marginTop: 14,
    color: '#424242',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#757575',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 3,
  },
  loader: {
    marginVertical: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00796B',
  },
  modalList: {
    maxHeight: 350,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  filterOptionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});

export default HistorialProyecto;