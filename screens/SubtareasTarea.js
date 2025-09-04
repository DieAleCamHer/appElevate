import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, Modal, TouchableOpacity,
  StatusBar, ActivityIndicator, ScrollView, Platform, BackHandler,
  SafeAreaView, KeyboardAvoidingView, Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection, addDoc, query, where, getDocs, deleteDoc, doc,
  Timestamp, updateDoc, getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { calcularAvanceSubtareas, calcularAvanceTareas } from '../utils/calcularPorcentaje';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Feather, AntDesign, Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

const SubtareasTarea = ({ route, navigation }) => {
  const { tareaId, userId, userEmail, proyectoId, userRole } = route.params;

  const [subtareas, setSubtareas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [nombreTarea, setNombreTarea] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(userRole);

  const [modalVisible, setModalVisible] = useState(false);
  const [subtareaAEliminar, setSubtareaAEliminar] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [taskDate, setTaskDate] = useState(null);
  const [projectDueDate, setProjectDueDate] = useState(null);
  const [timeEditor, setTimeEditor] = useState(new Date());

  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setCurrentUser(user);

    if (!userRole) {
      obtenerRolUsuario();
    }

    refrescar();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => backHandler.remove();
  }, [navigation]);

  const obtenerRolUsuario = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.rol || 'miembro');
        }
      }
    } catch (error) {
      console.error('Error al obtener rol del usuario:', error);
      setCurrentUserRole('miembro');
    }
  };

  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  const refrescar = async () => {
    setLoading(true);
    try {
      await Promise.all([obtenerSubtareas(), obtenerTaskDate(), obtenerProjectDueDate(), obtenerNombreTarea()]);
    } finally {
      setLoading(false);
    }
  };

  const obtenerNombreTarea = async () => {
    try {
      const tareaRef = doc(db, 'tareas', tareaId);
      const snap = await getDoc(tareaRef);
      if (snap.exists()) {
        const data = snap.data();
        setNombreTarea(data.nombre || 'Tarea sin nombre');
      }
    } catch (error) {
      console.error('Error al obtener nombre de la tarea:', error);
      setNombreTarea('Tarea');
    }
  };

  const obtenerSubtareas = async () => {
    try {
      const q = query(collection(db, 'subtareas'), where('tareaId', '==', tareaId));
      const querySnapshot = await getDocs(q);
      const datos = querySnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          completado: 'completado' in data ? data.completado : false,
          fechaEntrega: data.fechaEntrega && typeof data.fechaEntrega.toDate === 'function'
            ? data.fechaEntrega.toDate()
            : null
        };
      });
      setSubtareas(datos);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las subtareas');
    }
  };

  const obtenerTaskDate = async () => {
    try {
      const tareaRef = doc(db, 'tareas', tareaId);
      const snap = await getDoc(tareaRef);
      if (snap.exists()) {
        const data = snap.data();
        const raw = data.fechaEntrega && typeof data.fechaEntrega.toDate === 'function'
          ? data.fechaEntrega.toDate()
          : data.fechaEntrega || null;
        const dateOnly = raw ? startOfDay(raw) : null;
        setTaskDate(dateOnly ?? startOfDay(new Date()));
        setTimeEditor(new Date());
      }
    } catch (e) {
      console.error('obtenerTaskDate:', e);
    }
  };

  const obtenerProjectDueDate = async () => {
    try {
      const pRef = doc(db, 'proyectos', proyectoId);
      const snap = await getDoc(pRef);
      if (snap.exists()) {
        const data = snap.data();
        const raw = data.fechaEntrega && typeof data.fechaEntrega.toDate === 'function'
          ? data.fechaEntrega.toDate()
          : data.fechaEntrega || null;
        setProjectDueDate(raw ? endOfDay(raw) : null);
      }
    } catch (e) {
      console.error('obtenerProjectDueDate:', e);
    }
  };

  const actualizarAvance = async () => {
    try {
      const avanceTarea = await calcularAvanceSubtareas(tareaId);
      await updateDoc(doc(db, 'tareas', tareaId), { avance: avanceTarea });
      const avanceProyecto = await calcularAvanceTareas(proyectoId);
      await updateDoc(doc(db, 'proyectos', proyectoId), { avance: avanceProyecto });
    } catch (e) {
      console.error('actualizarAvance:', e);
    }
  };

  const registrarEnHistorial = async (accion, subtareaId, datosAdicionales = {}) => {
    try {
      await addDoc(collection(db, 'historial'), {
        accion,
        entidadId: subtareaId,
        proyectoId,
        tareaId,
        usuario: currentUser?.email || 'usuario@desconocido.com',
        usuarioUsername: currentUser?.email?.split('@')[0] || 'usuario',
        fechaCambio: Timestamp.now(),
        ...datosAdicionales
      });
    } catch (e) {
      console.error('registrarEnHistorial:', e);
    }
  };

  const onSelectTaskDate = async (selectedDate) => {
    if (!selectedDate) return;
    const today = startOfDay(new Date());
    const chosen = startOfDay(selectedDate);
    if (chosen < today) {
      Alert.alert('Fecha inválida', 'No puedes seleccionar una fecha anterior a hoy.');
      return;
    }
    if (projectDueDate && chosen > startOfDay(projectDueDate)) {
      Alert.alert('Fecha inválida', 'No puedes exceder el día de entrega del proyecto.');
      return;
    }
    try {
      setLoading(true);
      await updateDoc(doc(db, 'tareas', tareaId), { fechaEntrega: Timestamp.fromDate(chosen) });
      setTaskDate(chosen);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la fecha de la tarea.');
    } finally {
      setLoading(false);
    }
  };

  const crearSubtarea = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    if (!taskDate) {
      Alert.alert('Error', 'Define primero la fecha de la tarea.');
      return;
    }

    const dt = new Date(taskDate);
    dt.setHours(timeEditor.getHours(), timeEditor.getMinutes(), 0, 0);

    const now = new Date();
    if (dt < now) {
      Alert.alert('Error', 'La fecha/hora de la subtarea debe ser futura.');
      return;
    }
    if (projectDueDate && dt > endOfDay(projectDueDate)) {
      Alert.alert('Error', 'No puedes dar más tiempo que el día de entrega del proyecto.');
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'subtareas'), {
        nombre: nombre.trim(),
        tareaId,
        completado: false,
        fechaEntrega: Timestamp.fromDate(dt),
        fechaCreacion: Timestamp.now(),
        creadoPor: currentUser?.email || 'usuario@desconocido.com'
      });

      // ✅ No registrar en historial la creación
      // await registrarEnHistorial('CREAR_SUBTAREA', ref.id, { ... });

      setNombre('');
      await obtenerSubtareas();
      await actualizarAvance();
    } catch {
      Alert.alert('Error', 'Error al crear la subtarea');
    } finally {
      setLoading(false);
    }
  };


  const toggleCompletado = async (subtareaId, completadoActual, nombreSubtarea) => {
    try {
      setLoading(true);
      const nuevo = !completadoActual;
      await updateDoc(doc(db, 'subtareas', subtareaId), { completado: nuevo });
      await registrarEnHistorial(nuevo ? 'COMPLETAR_SUBTAREA' : 'REABRIR_SUBTAREA', subtareaId, {
        nombreSubtarea,
        estadoNuevo: nuevo ? 'Completada' : 'Pendiente'
      });
      await obtenerSubtareas();
      await actualizarAvance();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const eliminarSubtarea = async (subtareaId) => {
    if (currentUserRole !== 'gerente') {
      Alert.alert("Error", "Solo los gerentes pueden eliminar subtareas.");
      return;
    }

    try {
      setLoading(true);
      const subtareaRef = doc(db, 'subtareas', subtareaId);
      const subtareaSnap = await getDoc(subtareaRef);
      const subtareaData = subtareaSnap.data();

      await deleteDoc(subtareaRef);

      await registrarEnHistorial('ELIMINAR_SUBTAREA', subtareaId, {
        nombreSubtarea: subtareaData?.nombre || 'Subtarea sin nombre',
        estadoAnterior: subtareaData?.completado ? 'Completada' : 'Pendiente'
      });

      Alert.alert('Éxito', 'Subtarea eliminada correctamente');
      await obtenerSubtareas();
      await actualizarAvance();
    } catch {
      Alert.alert('Error', 'Error al eliminar la subtarea');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminacion = async () => {
    if (!confirmPassword) {
      Alert.alert("Error", "Ingresa tu contraseña.");
      return;
    }
    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert('Error', 'No hay sesión activa.');
      return;
    }

    try {
      setLoading(true);

      const credential = EmailAuthProvider.credential(user.email, confirmPassword);
      await reauthenticateWithCredential(user, credential);

      await eliminarSubtarea(subtareaAEliminar);

      setModalVisible(false);
      setConfirmPassword('');
    } catch (e) {
      const code = e?.code || '';
      if (code === 'auth/wrong-password') {
        Alert.alert('Error', 'Contraseña incorrecta.');
      } else if (code === 'auth/too-many-requests') {
        Alert.alert('Error', 'Demasiados intentos. Intenta más tarde.');
      } else if (code === 'auth/user-mismatch' || code === 'auth/user-not-found') {
        Alert.alert('Error', 'Cuenta no coincide con la sesión actual.');
      } else if (code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Credenciales inválidas.');
      } else if (code === 'auth/operation-not-allowed') {
        Alert.alert('Error', 'Método no permitido para este usuario.');
      } else {
        Alert.alert('Error', 'No se pudo verificar la contraseña.');
      }
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatHora = (fecha) => {
    if (!fecha) return '--:--';
    return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#3a7bd5" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.container}>
          {/* Header con botón de retroceso - CORREGIDO */}
          <LinearGradient colors={['#3a7bd5', '#00d2ff']} style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.headerContent}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                  Subtareas de: {nombreTarea}
                </Text>
                <Text style={styles.subtitle}>
                  {subtareas.length} {subtareas.length === 1 ? 'subtarea' : 'subtareas'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.refreshButton} 
                onPress={refrescar}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="refresh" size={22} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView 
            style={styles.scrollContainer} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Formulario de creación */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Crear Subtarea</Text>

              <View style={styles.inputContainer}>
                <MaterialIcons name="title" size={20} color="#3a7bd5" style={styles.inputIcon} />
                <TextInput
                  placeholder="Nombre de la subtarea"
                  placeholderTextColor="#90A4AE"
                  value={nombre}
                  onChangeText={setNombre}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={() => { if (nombre.trim()) crearSubtarea(); }}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfInput]}>
                  <MaterialIcons name="date-range" size={20} color="#3a7bd5" style={styles.inputIcon} />
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowTaskDatePicker(true)}
                    disabled={loading}
                  >
                    <Text style={[styles.dateText, !taskDate && styles.placeholderText]}>
                      {taskDate ? formatFecha(taskDate) : 'Seleccionar fecha'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputContainer, styles.halfInput]}>
                  <MaterialIcons name="access-time" size={20} color="#3a7bd5" style={styles.inputIcon} />
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowTimePicker(true)}
                    disabled={loading}
                  >
                    <Text style={styles.dateText}>
                      {formatHora(timeEditor)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showTaskDatePicker && (
                <DateTimePicker
                  value={taskDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  maximumDate={projectDueDate || undefined}
                  onChange={async (event, selectedDate) => {
                    setShowTaskDatePicker(false);
                    if (selectedDate) await onSelectTaskDate(selectedDate);
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={timeEditor}
                  mode="time"
                  is24Hour
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (selectedTime) setTimeEditor(new Date(selectedTime));
                  }}
                />
              )}

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, (!nombre.trim() || loading) && styles.disabledButton]}
                onPress={crearSubtarea}
                disabled={loading || !nombre.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <AntDesign name="pluscircleo" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Crear Subtarea</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Lista de subtareas */}
            {loading && subtareas.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3a7bd5" />
                <Text style={styles.loadingText}>Cargando subtareas...</Text>
              </View>
            ) : subtareas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="list" size={40} color="#cfd8dc" />
                <Text style={styles.emptyText}>No hay subtareas</Text>
                <Text style={styles.emptySubtext}>Crea tu primera subtarea</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Subtareas</Text>
                {subtareas.map((item) => (
                  <View key={item.id} style={[styles.card, item.completado && styles.completedCard]}>
                    <View style={styles.cardHeader}>
                      <TouchableOpacity
                        onPress={() => toggleCompletado(item.id, item.completado, item.nombre)}
                        disabled={currentUserRole !== 'miembro'}
                        style={styles.checkboxContainer}
                      >
                        <MaterialIcons
                          name={item.completado ? "check-box" : "check-box-outline-blank"}
                          size={24}
                          color={item.completado ? "#4CAF50" : "#757575"}
                        />
                        <Text style={[styles.cardTitle, item.completado && styles.completedText]}>
                          {item.nombre}
                        </Text>
                      </TouchableOpacity>
                      
                      {currentUserRole === 'gerente' && (
                        <TouchableOpacity
                          onPress={() => {
                            setSubtareaAEliminar(item.id);
                            setModalVisible(true);
                          }}
                          style={styles.deleteButton}
                        >
                          <MaterialIcons name="delete" size={20} color="#F44336" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <View style={[styles.statusBadge, item.completado ? styles.completedBadge : styles.pendingBadge]}>
                          <Text style={[styles.statusText, item.completado ? styles.completedStatus : styles.pendingStatus]}>
                            {item.completado ? 'Completada' : 'Pendiente'}
                          </Text>
                        </View>
                      </View>

                      {item.fechaEntrega && (
                        <View style={styles.dateRow}>
                          <Feather name="calendar" size={14} color="#757575" />
                          <Text style={styles.dateTextSmall}>
                            {new Date(item.fechaEntrega).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      )}

                      <View style={styles.creatorRow}>
                        <Feather name="user" size={12} color="#90A4AE" />
                        <Text style={styles.creatorText}>
                          {item.creadoPor?.split('@')[0] || 'Usuario'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Modal de eliminación */}
          <Modal visible={modalVisible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalIconContainer}>
                  <MaterialIcons name="warning" size={36} color="#FFA000" />
                </View>
                <Text style={styles.modalTitle}>Eliminar Subtarea</Text>
                <Text style={styles.modalText}>
                  ¿Estás seguro de eliminar esta subtarea? Esta acción no se puede deshacer.
                </Text>

                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock-outline" size={18} color="#3a7bd5" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Contraseña"
                    placeholderTextColor="#90A4AE"
                    secureTextEntry
                    style={styles.modalInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false);
                      setConfirmPassword('');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton, (!confirmPassword || loading) && styles.disabledButton]}
                    onPress={confirmarEliminacion}
                    disabled={!confirmPassword || loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Eliminar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3a7bd5'
  },
  keyboardAvoid: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  // HEADER CORREGIDO - Ya no se ve muy arriba
  header: {
    paddingTop: Platform.OS === 'ios' ? 15 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50, // Altura fija para consistencia
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isSmallDevice ? 12 : 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#3a7bd5',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    height: 50,
  },
  inputIcon: {
    padding: 10,
    marginLeft: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    color: '#263238',
    height: 48,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  dateInput: {
    flex: 1,
    padding: 10,
    height: 48,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#263238',
  },
  placeholderText: {
    color: '#90A4AE',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#3a7bd5',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#3a7bd5',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyText: {
    marginTop: 16,
    color: '#90A4AE',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#90A4AE',
    fontSize: 14,
    marginTop: 6,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#3a7bd5',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  completedCard: {
    opacity: 0.8,
    backgroundColor: '#f8f9fa',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: isSmallDevice ? 16 : 17,
    color: '#263238',
    marginLeft: 12,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#90A4AE',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
  },
  cardBody: {
    marginBottom: 4,
  },
  infoRow: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  completedStatus: {
    color: '#4CAF50',
  },
  pendingStatus: {
    color: '#FFA000',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  dateTextSmall: {
    fontSize: 13,
    color: '#757575',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorText: {
    color: '#90A4AE',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: '700',
    color: '#3a7bd5',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: isSmallDevice ? 15 : 16,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#263238',
    height: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: 'rgba(58, 123, 213, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  cancelButtonText: {
    color: '#546E7A',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default SubtareasTarea;