import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, Modal, TouchableOpacity,
  StatusBar, ActivityIndicator, ScrollView, Platform, BackHandler
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
import { MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';

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
      const ref = await addDoc(collection(db, 'subtareas'), {
        nombre: nombre.trim(),
        tareaId,
        completado: false,
        fechaEntrega: Timestamp.fromDate(dt),
        fechaCreacion: Timestamp.now(),
        creadoPor: currentUser?.email || 'usuario@desconocido.com'
      });
      await registrarEnHistorial('CREAR_SUBTAREA', ref.id, {
        nombreSubtarea: nombre.trim(),
        estadoNew: 'Pendiente'
      });
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3a7bd5" />

      <LinearGradient colors={['#3a7bd5', '#00d2ff']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ width: 40 }} />
          <View style={styles.headerContent}>
            <Text style={styles.title}>Subtareas de: {nombreTarea}</Text>
            <Text style={styles.subtitle}>
              {subtareas.length} {subtareas.length === 1 ? 'subtarea' : 'subtareas'}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={refrescar}>
            <MaterialIcons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
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
              >
                <Text style={styles.dateText}>
                  {taskDate ? formatFecha(taskDate) : 'Fecha tarea'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, styles.halfInput]}>
              <MaterialIcons name="access-time" size={20} color="#3a7bd5" style={styles.inputIcon} />
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowTimePicker(true)}
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
            style={[styles.button, styles.primaryButton]}
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
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    onPress={() => toggleCompletado(item.id, item.completado, item.nombre)}
                    disabled={currentUserRole !== 'miembro'}
                  >
                    <MaterialIcons
                      name={item.completado ? "check-box" : "check-box-outline-blank"}
                      size={24}
                      color={item.completado ? "#4CAF50" : "#757575"}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.cardTitle, item.completado && styles.completedText]}>
                    {item.nombre}
                  </Text>
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
      <Modal visible={modalVisible} transparent animationType="fade">
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
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
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
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 6,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3a7bd5',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 15,
    color: '#263238',
    minHeight: 40,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  dateInput: {
    flex: 1,
    padding: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#263238',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#3a7bd5',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#3a7bd5',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 12,
  },
  emptyText: {
    marginTop: 12,
    color: '#90A4AE',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#90A4AE',
    fontSize: 12,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3a7bd5',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: '#263238',
    marginLeft: 8,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#90A4AE',
  },
  deleteButton: {
    padding: 6,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 6,
  },
  cardBody: {
    marginBottom: 4,
  },
  infoRow: {
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
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
    fontSize: 11,
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
    marginBottom: 4,
    gap: 4,
  },
  dateTextSmall: {
    fontSize: 12,
    color: '#757575',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorText: {
    color: '#90A4AE',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3a7bd5',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    color: '#263238',
    minHeight: 40,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: 'rgba(58, 123, 213, 0.1)',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  cancelButtonText: {
    color: '#546E7A',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SubtareasTarea;