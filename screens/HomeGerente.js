import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  BackHandler,
  StatusBar,
  Animated,
  Dimensions,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

// Puntos de referencia para responsive design
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Funciones para escalar proporcionalmente
const scale = size => width / guidelineBaseWidth * size;
const verticalScale = size => height / guidelineBaseHeight * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Función para detectar orientación
const isPortrait = () => height >= width;

const HomeGerente = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const [proyectos, setProyectos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState(new Date());
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [modalAsignarVisible, setModalAsignarVisible] = useState(false);
  const [miembrosDisponibles, setMiembrosDisponibles] = useState([]);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [searchText, setSearchText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [proyectoAEditar, setProyectoAEditar] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [selectedMemberToRemove, setSelectedMemberToRemove] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const [showFloatingNotification, setShowFloatingNotification] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatingNotifAnim = useRef(new Animated.Value(-100)).current;

  const descripcionRef = useRef(null);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const clampFecha = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x < hoy ? hoy : d;
  };

  const miembrosFiltrados = miembrosDisponibles.filter(
    (miembro) =>
      (miembro?.nombre ?? '').toLowerCase().includes((searchText ?? '').toLowerCase()) ||
      (miembro?.username ?? '').toLowerCase().includes((searchText ?? '').toLowerCase())
  );

  useEffect(() => {
    obtenerProyectos();
    setupNotifications();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

  const setupNotifications = () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'notificaciones'),
      where('userId', '==', user.uid),
      where('seen', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newCount = snapshot.size;

      // Mostrar notificación flotante si hay nuevas notificaciones
      if (newCount > lastNotificationCount && newCount > 0) {
        mostrarNotificacionFloating();
      }

      setUnreadNotifications(newCount);
      setLastNotificationCount(newCount);
    });

    return unsubscribe;
  };

  const mostrarNotificacionFloating = () => {
    setShowFloatingNotification(true);

    // Animación de entrada
    Animated.sequence([
      Animated.parallel([
        Animated.timing(floatingNotifAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]),
      Animated.delay(3000), // Mostrar por 3 segundos
      Animated.parallel([
        Animated.timing(floatingNotifAnim, {
          toValue: -100,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      setShowFloatingNotification(false);
    });
  };

  const handleNotificationPress = () => {
    // Detener animación y navegar a notificaciones
    floatingNotifAnim.setValue(-100);
    fadeAnim.setValue(0);
    setShowFloatingNotification(false);
    navigation.navigate('Notificaciones');
  };

  const handleBackPress = () => {
    mostrarConfirmacionCerrarSesion();
    return true;
  };

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleMenuAction = (action) => {
    toggleMenu();
    switch (action) {
      case 'notifications':
        navigation.navigate('Notificaciones');
        break;
      case 'calendar':
        navigation.navigate('Calendario');
        break;
      case 'logout':
        mostrarConfirmacionCerrarSesion();
        break;
      default:
        break;
    }
  };

  const mostrarConfirmacionCerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Quieres cerrar tu sesión como gerente?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => { }
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

  const obtenerProyectos = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'proyectos'), where('creadorId', '==', userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProyectos(data);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      Alert.alert('Error', 'No se pudieron cargar los proyectos');
    } finally {
      setLoading(false);
    }
  };

  const crearProyecto = async () => {
    if (!nombre.trim() || !descripcion.trim() || !fechaEntrega || !userId) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    try {
      const fechaOk = clampFecha(fechaEntrega);
      await addDoc(collection(db, 'proyectos'), {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        fechaEntrega: fechaOk.toISOString(),
        creadorId: userId,
        avance: 0,
        miembros: [],
        historialComentarios: [],
      });
      setNombre('');
      setDescripcion('');
      setFechaEntrega(new Date());
      await obtenerProyectos();
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      Alert.alert('Error', error.message);
    }
  };

  const obtenerMiembros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'usuarios'), where('rol', '==', 'miembro'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMiembrosDisponibles(data);
      setSearchText('');
    } catch (error) {
      console.error('Error al cargar miembros:', error);
    } finally {
      setLoading(false);
    }
  };

  const asignarMiembro = async () => {
    if (!proyectoSeleccionado || !miembroSeleccionado) {
      Alert.alert('Error', 'Debes seleccionar un proyecto y un miembro');
      return;
    }

    try {
      setLoading(true);
      const proyectoRef = doc(db, 'proyectos', proyectoSeleccionado.id);
      await updateDoc(proyectoRef, {
        miembros: arrayUnion(miembroSeleccionado),
        historialComentarios: arrayUnion({
          tipo: 'asignacion',
          miembroId: miembroSeleccionado,
          fecha: new Date().toISOString(),
          mensaje: 'Miembro asignado al proyecto',
        }),
      });
      setModalAsignarVisible(false);
      setMiembroSeleccionado(null);
      await obtenerProyectos();
    } catch (error) {
      console.error('Error al asignar miembro:', error);
      Alert.alert('Error', 'No se pudo asignar el miembro');
    } finally {
      setLoading(false);
    }
  };

  const eliminarMiembro = async () => {
    if (!proyectoSeleccionado || !selectedMemberToRemove) {
      Alert.alert('Error', 'Debes seleccionar un miembro para eliminar');
      return;
    }

    try {
      setLoading(true);
      const proyectoRef = doc(db, 'proyectos', proyectoSeleccionado.id);
      await updateDoc(proyectoRef, {
        miembros: arrayRemove(selectedMemberToRemove.id),
        historialComentarios: arrayUnion({
          tipo: 'eliminacion',
          miembroId: selectedMemberToRemove.id,
          fecha: new Date().toISOString(),
          mensaje: 'Miembro eliminado del proyecto',
        }),
      });
      setShowRemoveMemberModal(false);
      setSelectedMemberToRemove(null);
      await obtenerProyectos();
      Alert.alert('Éxito', 'Miembro eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar miembro:', error);
      Alert.alert('Error', 'No se pudo eliminar el miembro');
    } finally {
      setLoading(false);
    }
  };

  const eliminarProyecto = async () => {
    if (!proyectoAEliminar) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'usuarios', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (password !== userData.password) {
          Alert.alert('Error', 'Contraseña incorrecta');
          return;
        }

        await deleteDoc(doc(db, 'proyectos', proyectoAEliminar));
        setModalVisible(false);
        setPassword('');
        await obtenerProyectos();
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      Alert.alert('Error', 'No se pudo eliminar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const verMiembrosAsignados = async (proyecto) => {
    const miembros = Array.isArray(proyecto?.miembros) ? proyecto.miembros : [];

    if (miembros.length === 0) {
      setModalTitle('Miembros Asignados');
      setMembersList(['No hay miembros asignados']);
      setProyectoSeleccionado(proyecto);
      setShowMembersModal(true);
      return;
    }

    try {
      setLoading(true);
      const miembrosConInfo = [];

      for (const raw of miembros) {
        // Acepta string o objeto con { id }
        const id = typeof raw === 'string' ? raw : raw?.id;
        if (!id) continue; // evita null/undefined

        const docRef = doc(db, 'usuarios', String(id));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() || {};
          miembrosConInfo.push({
            id,
            nombre: data?.nombre ?? '(sin nombre)',
            username: data?.username ?? '(sin usuario)',
          });
        }
      }

      setModalTitle('Miembros Asignados');
      setMembersList(miembrosConInfo.length ? miembrosConInfo : ['No hay miembros asignados']);
      setProyectoSeleccionado(proyecto);
      setShowMembersModal(true);
    } catch (error) {
      console.error('Error al obtener miembros:', error);
      setModalTitle('Error');
      setMembersList(['No se pudieron cargar los miembros asignados']);
      setShowMembersModal(true);
    } finally {
      setLoading(false);
    }
  };


  const editarProyecto = async () => {
    if (!proyectoAEditar || !nombre.trim() || !descripcion.trim()) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    try {
      setLoading(true);
      const proyectoRef = doc(db, 'proyectos', proyectoAEditar.id);
      const fechaOk = clampFecha(fechaEntrega);
      await updateDoc(proyectoRef, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        fechaEntrega: fechaOk.toISOString(),
      });

      setEditModalVisible(false);
      await obtenerProyectos();
      Alert.alert('Éxito', 'Proyecto actualizado correctamente');
    } catch (error) {
      console.error('Error al editar proyecto:', error);
      Alert.alert('Error', 'No se pudo actualizar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const handleVerHistorial = (proyecto) => {
    navigation.navigate('HistorialProyecto', { proyectoId: proyecto.id });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />

      {/*HEADER*/}
      <LinearGradient
        colors={['#3A7BD5', '#2980b9']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
            <Icon name="menu" size={moderateScale(28)} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Panel de Gerente</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={obtenerProyectos} style={styles.refreshButton}>
            <Icon name="refresh" size={moderateScale(24)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* MENÚ HAMBURGUESA */}
      {menuVisible && (
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={toggleMenu}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <LinearGradient
              colors={['#2C3E50', '#34495e']}
              style={styles.menuGradient}
            >
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menú</Text>
                <TouchableOpacity onPress={toggleMenu} style={styles.closeMenuButton}>
                  <Icon name="close" size={moderateScale(24)} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuAction('notifications')}
                >
                  <View style={styles.menuItemLeft}>
                    <Icon name="notifications" size={moderateScale(22)} color="#FFFFFF" />
                    <Text style={styles.menuItemText}>Notificaciones</Text>
                  </View>
                  {unreadNotifications > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{unreadNotifications}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuAction('calendar')}
                >
                  <View style={styles.menuItemLeft}>
                    <Icon name="calendar-today" size={moderateScale(22)} color="#FFFFFF" />
                    <Text style={styles.menuItemText}>Calendario</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuAction('logout')}
                >
                  <View style={styles.menuItemLeft}>
                    <Icon name="exit-to-app" size={moderateScale(22)} color="#FF6B6B" />
                    <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>
                      Cerrar Sesión
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.menuFooter}>
                <Text style={styles.menuFooterText}></Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      )}

      <LinearGradient colors={['#3A7BD5', '#00D2FF']} style={styles.background}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* FORMULARIO DE CREACIÓN */}
            <View style={styles.creationContainer}>
              <Text style={styles.sectionTitle}>Crear Nuevo Proyecto</Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre del proyecto *"
                value={nombre}
                onChangeText={setNombre}
                returnKeyType="next"
                onSubmitEditing={() => descripcionRef?.current?.focus()}
              />

              <TextInput
                ref={descripcionRef}
                style={[styles.input, styles.multilineInput]}
                placeholder="Descripción *"
                multiline
                value={descripcion}
                onChangeText={setDescripcion}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => {
                  if (nombre.trim() && descripcion.trim()) crearProyecto();
                }}
              />

              <TouchableOpacity style={styles.dateButton} onPress={() => setShowCreateDatePicker(true)}>
                <Icon name="event" size={moderateScale(20)} color="#3A7BD5" />
                <Text style={styles.dateButtonText}>
                  {fechaEntrega.toLocaleDateString() || 'Seleccionar fecha'}
                </Text>
              </TouchableOpacity>

              {showCreateDatePicker && (
                <DateTimePicker
                  value={fechaEntrega}
                  mode="date"
                  display="default"
                  minimumDate={hoy}
                  onChange={(event, selectedDate) => {
                    setShowCreateDatePicker(false);
                    if (selectedDate) {
                      const d = new Date(selectedDate);
                      d.setHours(0, 0, 0, 0);
                      if (d < hoy) {
                        Alert.alert('Fecha inválida', 'Seleccione una fecha a partir de hoy.');
                        setFechaEntrega(hoy);
                      } else {
                        setFechaEntrega(selectedDate);
                      }
                    }
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.createButton}
                onPress={crearProyecto}
                disabled={!nombre.trim() || !descripcion.trim()}
              >
                <Text style={styles.createButtonText}>Crear Proyecto</Text>
              </TouchableOpacity>
            </View>

            {/* LISTA DE PROYECTOS */}
            <View style={styles.projectsContainer}>
              <Text style={styles.projectsTitle}>Mis Proyectos</Text>

              {loading ? (
                <ActivityIndicator size="large" color="#3A7BD5" style={styles.loader} />
              ) : (
                <FlatList
                  data={proyectos}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.projectCard}>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('TareasProyecto', {
                            proyectoId: item.id,
                            userId: userId,
                          })
                        }
                        style={styles.cardContent}
                      >
                        <View style={styles.projectHeader}>
                          <Text style={styles.projectName}>{item.nombre}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: moderateScale(6) }}>
                            <Icon name="event" size={moderateScale(16)} color="#3A7BD5" />
                            <Text style={styles.projectDueDate}>
                              {new Date(item.fechaEntrega).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.projectDescription}>{item.descripcion}</Text>

                        <View style={styles.progressContainer}>
                          <View
                            style={[
                              styles.progressBar,
                              { width: `${Math.max(0, Math.min(100, item.avance ?? 0))}%` },
                            ]}
                          />
                          <Text style={styles.progressText}>{item.avance ?? 0}% completado</Text>
                        </View>
                      </TouchableOpacity>

                      {/* BOTONES DE ACCIÓN */}
                      <View style={styles.projectActions}>
                        <TouchableOpacity style={styles.historyButton} onPress={() => handleVerHistorial(item)}>
                          <Icon name="history" size={moderateScale(20)} color="#FF9800" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => {
                            setProyectoAEditar(item);
                            setNombre(item.nombre);
                            setDescripcion(item.descripcion);
                            setFechaEntrega(new Date(item.fechaEntrega));
                            setEditModalVisible(true);
                          }}
                        >
                          <Icon name="edit" size={moderateScale(20)} color="#4CAF50" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            setProyectoSeleccionado(item);
                            obtenerMiembros();
                            setModalAsignarVisible(true);
                          }}
                        >
                          <Icon name="person-add" size={moderateScale(20)} color="#3A7BD5" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.membersButton} onPress={() => verMiembrosAsignados(item)}>
                          <Icon name="people" size={moderateScale(20)} color="#3A7BD5" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => {
                            setProyectoAEliminar(item.id);
                            setModalVisible(true);
                          }}
                        >
                          <Icon name="delete" size={moderateScale(20)} color="#e53935" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Icon name="folder" size={moderateScale(50)} color="#90A4AE" />
                      <Text style={styles.emptyText}>No tienes proyectos aún</Text>
                    </View>
                  }
                  scrollEnabled={false}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* NOTIFICACIÓN FLOTANTE */}
      {showFloatingNotification && (
        <Animated.View
          style={[
            styles.floatingNotification,
            {
              opacity: fadeAnim,
              transform: [{ translateY: floatingNotifAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.floatingNotificationContent}
            onPress={handleNotificationPress}
            activeOpacity={0.9}
          >
            {/* Fondo con gradiente y efecto de brillo */}
            <LinearGradient
              colors={['#7C4DFF', '#448AFF']}
              style={styles.floatingNotificationGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {/* Efecto de brillo sutil */}
              <View style={styles.glowEffect} />

              {/* Contenido de la notificación */}
              <View style={styles.notificationContent}>

                {/* Icono con efecto neomórfico */}
                <View style={styles.iconContainer}>
                  <View style={styles.iconBackground}>
                    <Icon name="notifications" size={moderateScale(24)} color="#7C4DFF" />
                  </View>
                  {unreadNotifications > 0 && (
                    <View style={styles.floatingNotificationBadge}>
                      <Text style={styles.floatingNotificationBadgeText}>
                        {unreadNotifications}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Texto de la notificación */}
                <View style={styles.floatingNotificationTextContainer}>
                  <Text style={styles.floatingNotificationTitle} numberOfLines={1}>
                    {unreadNotifications === 1 ? '¡Nueva notificación!' : `Tienes ${unreadNotifications} nuevas notificaciones`}
                  </Text>

                  <View style={styles.notificationDivider} />

                  <View style={styles.subtitleContainer}>
                    <Icon name="touch-app" size={moderateScale(16)} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.floatingNotificationSubtitle}>
                      Toca para ver detalles
                    </Text>
                  </View>
                </View>

                {/* Flecha con contenedor circular */}
                <View style={styles.arrowContainer}>
                  <View style={styles.arrowCircle}>
                    <Icon name="arrow-forward" size={moderateScale(20)} color="#7C4DFF" />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Modal para asignar miembros */}
      <Modal visible={modalAsignarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Asignar Miembro</Text>

            <View style={styles.searchContainer}>
              <Icon name="search" size={moderateScale(20)} color="#90A4AE" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar miembros..."
                placeholderTextColor="#90A4AE"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <ScrollView style={styles.modalScroll}>
              {miembrosFiltrados.map((miembro) => (
                <TouchableOpacity
                  key={miembro.id}
                  onPress={() => setMiembroSeleccionado(miembro.id)}
                  style={[styles.memberItem, miembroSeleccionado === miembro.id && styles.selectedMember]}
                >
                  <View style={styles.memberAvatar}>
                    <Icon name="person" size={moderateScale(24)} color="#FFF" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{miembro.nombre}</Text>
                    <Text style={styles.memberUsername}>@{miembro.username}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalAsignarVisible(false);
                  setSearchText('');
                  setMiembroSeleccionado(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={asignarMiembro}
                disabled={!miembroSeleccionado || loading}
              >
                <LinearGradient
                  colors={['#3A7BD5', '#00D2FF']}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.confirmButtonText}>{loading ? 'Asignando...' : 'Asignar'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para mostrar miembros asignados */}
      <Modal visible={showMembersModal} transparent animationType="fade" onRequestClose={() => setShowMembersModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.customAlertContainer}>
            <Text style={styles.customAlertTitle}>{modalTitle}</Text>

            <ScrollView style={styles.customAlertScroll}>
              {membersList.length > 0 && typeof membersList[0] === 'object' ? (
                membersList.map((miembro) => (
                  <View key={miembro.id} style={styles.memberListItem}>
                    <View style={styles.memberBullet}>
                      <Icon name="person" size={moderateScale(16)} color="#3A7BD5" />
                    </View>
                    <Text style={styles.memberListText}>
                      {miembro.nombre} (@{miembro.username})
                    </Text>
                    <TouchableOpacity
                      style={styles.removeMemberButton}
                      onPress={() => {
                        setSelectedMemberToRemove(miembro);
                        setShowRemoveMemberModal(true);
                        setShowMembersModal(false);
                      }}
                    >
                      <Icon name="remove-circle" size={moderateScale(20)} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.memberListText}>{membersList[0]}</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.customAlertButton} onPress={() => setShowMembersModal(false)}>
              <Text style={styles.customAlertButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para confirmar eliminación de miembro */}
      <Modal visible={showRemoveMemberModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Eliminar Miembro</Text>
            <Text style={styles.deleteMessage}>
              ¿Estás seguro de que quieres eliminar a {selectedMemberToRemove?.nombre} del proyecto?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowRemoveMemberModal(false);
                  setSelectedMemberToRemove(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmButton} onPress={eliminarMiembro} disabled={loading}>
                <LinearGradient colors={['#FF5252', '#FF1744']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.confirmButtonText}>{loading ? 'Eliminando...' : 'Eliminar'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para eliminar proyecto */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
            <Text style={styles.deleteMessage}>¿Estás seguro que deseas eliminar este proyecto?</Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Ingresa tu contraseña para confirmar"
              placeholderTextColor="#90A4AE"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmButton} onPress={eliminarProyecto} disabled={loading}>
                <LinearGradient colors={['#FF5252', '#FF1744']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.confirmButtonText}>{loading ? 'Eliminando...' : 'Eliminar'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para editar proyecto */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Proyecto</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del proyecto *"
              value={nombre}
              onChangeText={setNombre}
              returnKeyType="next"
              onSubmitEditing={() => descripcionRef?.current?.focus()}
            />

            <TextInput
              ref={descripcionRef}
              style={[styles.input, styles.multilineInput]}
              placeholder="Descripción *"
              multiline
              value={descripcion}
              onChangeText={setDescripcion}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => {
                if (nombre.trim() && descripcion.trim()) editarProyecto();
              }}
            />

            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEditDatePicker(true)}>
              <Icon name="event" size={moderateScale(20)} color="#3A7BD5" />
              <Text style={styles.dateButtonText}>{fechaEntrega.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showEditDatePicker && (
              <DateTimePicker
                value={fechaEntrega}
                mode="date"
                display="default"
                minimumDate={hoy}
                onChange={(event, selectedDate) => {
                  setShowEditDatePicker(false);
                  if (selectedDate) {
                    const d = new Date(selectedDate);
                    d.setHours(0, 0, 0, 0);
                    if (d < hoy) {
                      Alert.alert('Fecha inválida', 'Seleccione una fecha a partir de hoy.');
                      setFechaEntrega(hoy);
                    } else {
                      setFechaEntrega(selectedDate);
                    }
                  }
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmButton} onPress={editarProyecto} disabled={loading}>
                <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.gradientButton}>
                  <Text style={styles.confirmButtonText}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Text>
                </LinearGradient>
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
    backgroundColor: '#F8FAFF',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(16),
    paddingTop: Platform.OS === 'ios' ? verticalScale(50) : StatusBar.currentHeight + verticalScale(10),
    paddingBottom: verticalScale(16),
    borderBottomLeftRadius: moderateScale(20),
    borderBottomRightRadius: moderateScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(8),
    elevation: 8,
    zIndex: 1000,
    minHeight: verticalScale(80),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: width * 0.6,
  },
  refreshButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.75,
    maxWidth: moderateScale(300),
    zIndex: 2001,
  },
  menuGradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? verticalScale(60) : StatusBar.currentHeight + verticalScale(20),
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeMenuButton: {
    padding: moderateScale(4),
  },
  menuItems: {
    padding: moderateScale(20),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(16),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(12),
    marginBottom: moderateScale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: moderateScale(12),
  },
  menuBadge: {
    backgroundColor: '#FF5252',
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: moderateScale(24),
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: verticalScale(16),
  },
  menuFooter: {
    position: 'absolute',
    bottom: verticalScale(20),
    left: moderateScale(20),
    right: moderateScale(20),
    alignItems: 'center',
  },
  menuFooterText: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: moderateScale(4),
  },
  scrollContent: {
    paddingBottom: verticalScale(16),
  },
  creationContainer: {
    backgroundColor: 'white',
    borderRadius: moderateScale(14),
    padding: moderateScale(16),
    margin: moderateScale(12),
    marginBottom: moderateScale(12),
    elevation: 2,
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: verticalScale(12),
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#E3E9F1',
    borderRadius: moderateScale(10),
    padding: moderateScale(14),
    marginBottom: verticalScale(12),
    fontSize: moderateScale(14),
    color: '#263238',
    backgroundColor: '#F9FBFF',
    minHeight: verticalScale(20),
  },
  multilineInput: {
    minHeight: verticalScale(80),
    textAlignVertical: 'top',
    paddingTop: verticalScale(12),
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(14),
    borderWidth: 1.2,
    borderColor: '#E3E9F1',
    borderRadius: moderateScale(10),
    marginBottom: verticalScale(12),
    backgroundColor: '#F9FBFF',
  },
  dateButtonText: {
    marginLeft: moderateScale(10),
    fontSize: moderateScale(14),
    color: '#263238',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#3A7BD5',
    borderRadius: moderateScale(10),
    padding: verticalScale(14),
    alignItems: 'center',
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  projectsContainer: {
    paddingHorizontal: moderateScale(12),
  },
  projectsTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: verticalScale(12),
    marginLeft: moderateScale(4),
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(14),
    marginBottom: verticalScale(12),
    shadowColor: '#3A7BD5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: moderateScale(6),
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(58, 123, 213, 0.04)',
  },
  cardContent: {
    padding: moderateScale(16),
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(10),
  },
  projectName: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
    marginRight: moderateScale(10),
  },
  projectDueDate: {
    color: '#3A7BD5',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  projectDescription: {
    color: '#5A6B7C',
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(14),
  },
  progressContainer: {
    height: moderateScale(6),
    backgroundColor: '#ECEFF1',
    borderRadius: moderateScale(3),
    marginBottom: moderateScale(6),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3A7BD5',
    borderRadius: moderateScale(3),
  },
  progressText: {
    fontSize: moderateScale(11),
    color: '#78909C',
    fontWeight: '500',
    textAlign: 'right',
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: moderateScale(12),
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: 'rgba(58, 123, 213, 0.08)',
    borderBottomLeftRadius: moderateScale(14),
    borderBottomRightRadius: moderateScale(14),
  },
  actionButton: {
    marginLeft: moderateScale(10),
    padding: moderateScale(6),
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: moderateScale(8),
  },
  membersButton: {
    marginLeft: moderateScale(10),
    padding: moderateScale(6),
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderRadius: moderateScale(8),
  },
  editButton: {
    marginLeft: moderateScale(10),
    padding: moderateScale(6),
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: moderateScale(8),
  },
  deleteButton: {
    marginLeft: moderateScale(10),
    padding: moderateScale(6),
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderRadius: moderateScale(8),
  },
  historyButton: {
    marginLeft: moderateScale(10),
    padding: moderateScale(6),
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: moderateScale(8),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: verticalScale(30),
    marginTop: verticalScale(10),
  },
  emptyText: {
    marginTop: verticalScale(12),
    color: '#90A4AE',
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  loader: {
    marginVertical: verticalScale(30),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: moderateScale(14),
    width: width * 0.86,
    maxWidth: moderateScale(400),
    maxHeight: height * 0.78,
    padding: moderateScale(18),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modalTitle: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: '#3A7BD5',
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: height * 0.65,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(10),
    borderRadius: moderateScale(8),
    marginBottom: moderateScale(6),
    backgroundColor: '#F5F5F5',
  },
  selectedMember: {
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    borderWidth: 1,
    borderColor: '#3A7BD5',
  },
  memberAvatar: {
    backgroundColor: '#3A7BD5',
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(10),
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#263238',
  },
  memberUsername: {
    fontSize: moderateScale(12),
    color: '#78909C',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(16),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    borderRadius: moderateScale(8),
    padding: verticalScale(12),
    alignItems: 'center',
    marginRight: moderateScale(8),
  },
  cancelButtonText: {
    color: '#78909C',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  confirmButton: {
    flex: 1,
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  gradientButton: {
    padding: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  customAlertContainer: {
    backgroundColor: 'white',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    width: '80%',
    maxWidth: moderateScale(400),
    maxHeight: height * 0.65,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  customAlertTitle: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: '#3A7BD5',
    textAlign: 'center',
    marginBottom: verticalScale(14),
  },
  customAlertScroll: {
    maxHeight: height * 0.65,
    marginBottom: verticalScale(16),
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(8),
    paddingHorizontal: moderateScale(4),
  },
  memberBullet: {
    marginRight: moderateScale(8),
  },
  memberListText: {
    fontSize: moderateScale(14),
    color: '#546E7A',
    flex: 1,
    lineHeight: moderateScale(20),
  },
  removeMemberButton: {
    padding: moderateScale(4),
    marginLeft: moderateScale(8),
  },
  customAlertButton: {
    backgroundColor: '#3A7BD5',
    borderRadius: moderateScale(8),
    padding: verticalScale(12),
    alignItems: 'center',
  },
  customAlertButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(10),
    marginBottom: verticalScale(12),
    height: verticalScale(40),
  },
  searchIcon: {
    marginRight: moderateScale(8),
  },
  searchInput: {
    flex: 1,
    height: verticalScale(38),
    color: '#263238',
    fontSize: moderateScale(14),
  },
  passwordInput: {
    backgroundColor: 'rgba(236, 239, 241, 0.7)',
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginBottom: verticalScale(12),
    fontSize: moderateScale(14),
    color: '#263238',
  },
  deleteMessage: {
    fontSize: moderateScale(14),
    color: '#546E7A',
    marginBottom: verticalScale(16),
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  floatingNotification: {
    position: 'absolute',
    top: verticalScale(100),
    left: moderateScale(20),
    right: moderateScale(20),
    zIndex: 3000,
  },
  floatingNotificationContent: {
    width: '100%',
    borderRadius: moderateScale(20),
    overflow: 'hidden',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(15),
    elevation: 10,
  },
  floatingNotificationGradient: {
    padding: moderateScale(20),
    position: 'relative',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: verticalScale(-50),
    right: verticalScale(-50),
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    position: 'relative',
    marginRight: moderateScale(15),
  },
  iconBackground: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(25),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(5),
    elevation: 5,
  },
  floatingNotificationBadge: {
    position: 'absolute',
    top: verticalScale(-5),
    right: verticalScale(-5),
    backgroundColor: '#FF5252',
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  floatingNotificationBadgeText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },
  floatingNotificationTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  floatingNotificationTitle: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: verticalScale(6),
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  notificationDivider: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginVertical: verticalScale(8),
    width: '25%',
    borderRadius: 1,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingNotificationSubtitle: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: moderateScale(6),
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  arrowContainer: {
    marginLeft: moderateScale(10),
  },
  arrowCircle: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 4,
  },
});

export default HomeGerente;