import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    RefreshControl,
    Alert,
    Modal
} from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';

const Notificaciones = ({ navigation }) => {
    const [notificaciones, setNotificaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Función para obtener notificaciones
    const obtenerNotificaciones = async () => {
        try {
            setRefreshing(true);
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                console.log('Usuario no autenticado');
                return;
            }

            const q = query(
                collection(db, 'notificaciones'),
                where('userId', '==', user.uid)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc) => ({ 
                id: doc.id, 
                ...doc.data(),
                // Asegurar que la fecha se maneje correctamente
                date: doc.data().date ? doc.data().date.toDate() : new Date()
            }));
            
            // Ordenar por fecha, las más recientes primero
            data.sort((a, b) => b.date - a.date);
            setNotificaciones(data);
        } catch (error) {
            console.error("Error al obtener notificaciones:", error);
            Alert.alert("Error", "No se pudieron cargar las notificaciones");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Función para marcar notificación como vista
    const marcarComoVista = async (id) => {
        try {
            const notificacionRef = doc(db, 'notificaciones', id);
            await updateDoc(notificacionRef, { seen: true });

            setNotificaciones(notificaciones.map((notif) =>
                notif.id === id ? { ...notif, seen: true } : notif
            ));
        } catch (error) {
            console.error("Error al marcar como vista:", error);
            Alert.alert("Error", "No se pudo marcar como leída");
        }
    };

    // Función para eliminar notificación
    const eliminarNotificacion = async (id) => {
        try {
            await deleteDoc(doc(db, 'notificaciones', id));
            setNotificaciones(notificaciones.filter(notif => notif.id !== id));
            setModalVisible(false);
            Alert.alert("Éxito", "Notificación eliminada");
        } catch (error) {
            console.error("Error al eliminar notificación:", error);
            Alert.alert("Error", "No se pudo eliminar la notificación");
        }
    };

    // Función para marcar todas como vistas
    const marcarTodasComoVistas = async () => {
        try {
            const promises = notificaciones
                .filter(notif => !notif.seen)
                .map(notif => updateDoc(doc(db, 'notificaciones', notif.id), { seen: true }));

            await Promise.all(promises);
            setNotificaciones(notificaciones.map(notif => ({ ...notif, seen: true })));
            Alert.alert("Éxito", "Todas las notificaciones marcadas como leídas");
        } catch (error) {
            console.error("Error al marcar todas como vistas:", error);
            Alert.alert("Error", "No se pudieron marcar todas como leídas");
        }
    };

    // Función para eliminar todas las notificaciones leídas
    const eliminarTodasLeidas = async () => {
        try {
            const leidas = notificaciones.filter(notif => notif.seen);
            const promises = leidas.map(notif => deleteDoc(doc(db, 'notificaciones', notif.id)));

            await Promise.all(promises);
            setNotificaciones(notificaciones.filter(notif => !notif.seen));
            Alert.alert("Éxito", "Notificaciones leídas eliminadas");
        } catch (error) {
            console.error("Error al eliminar notificaciones leídas:", error);
            Alert.alert("Error", "No se pudieron eliminar las notificaciones leídas");
        }
    };

    // Obtener icono según el tipo o estado
    const obtenerIcono = (notificacion) => {
        const { type, estado } = notificacion;
        
        if (estado) {
            switch(estado.toLowerCase()) {
                case 'en progreso':
                    return { name: 'autorenew', color: '#FF9800' };
                case 'entrega tardía':
                    return { name: 'warning', color: '#F44336' };
                case 'finalizado':
                    return { name: 'check-circle', color: '#4CAF50' };
                case 'pendiente':
                    return { name: 'schedule', color: '#9E9E9E' };
                default:
                    return { name: 'notifications', color: '#3A7BD5' };
            }
        }
        
        if (type === 'subtarea') {
            return { name: 'assignment', color: '#3A7BD5' };
        }
        
        return { name: 'notifications', color: '#3A7BD5' };
    };

    // Formatear fecha correctamente
    const formatearFecha = (fecha) => {
        if (!fecha) return 'Fecha no disponible';
        
        try {
            // Si es un timestamp de Firestore
            if (fecha.toDate) {
                fecha = fecha.toDate();
            }
            
            // Si es un string, convertirlo a Date
            if (typeof fecha === 'string') {
                fecha = new Date(fecha);
            }
            
            // Verificar si es una fecha válida
            if (isNaN(fecha.getTime())) {
                return 'Fecha inválida';
            }
            
            return fecha.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error("Error al formatear fecha:", error, fecha);
            return 'Fecha inválida';
        }
    };

    // Abrir detalles de notificación
    const abrirDetalles = (notificacion) => {
        setSelectedNotification(notificacion);
        setModalVisible(true);
        
        // Marcar como vista si no lo está
        if (!notificacion.seen) {
            marcarComoVista(notificacion.id);
        }
    };

    useEffect(() => {
        obtenerNotificaciones();
    }, []);

    // Función para renderizar cada item
    const renderItem = ({ item }) => {
        const icono = obtenerIcono(item);
        
        return (
            <TouchableOpacity onPress={() => abrirDetalles(item)}>
                <View style={[
                    styles.notificationCard,
                    item.seen ? styles.seenCard : styles.unseenCard
                ]}>
                    <View style={styles.notificationHeader}>
                        <View style={[
                            styles.notificationIcon,
                            { backgroundColor: icono.color }
                        ]}>
                            <Icon
                                name={icono.name}
                                size={20}
                                color="#FFF"
                            />
                        </View>
                        <View style={styles.notificationContent}>
                            <Text style={[
                                styles.notificationMessage,
                                item.seen ? styles.seenText : styles.unseenText
                            ]} numberOfLines={2}>
                                {item.message}
                            </Text>
                            <Text style={styles.notificationDate}>
                                {formatearFecha(item.date)}
                            </Text>
                        </View>
                        {!item.seen && <View style={styles.unreadDot} />}
                    </View>

                    <View style={styles.notificationActions}>
                        {!item.seen && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => marcarComoVista(item.id)}
                            >
                                <LinearGradient
                                    colors={['#3A7BD5', '#00D2FF']}
                                    style={styles.gradientButtonSmall}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.actionButtonText}>Leído</Text>
                                    <Icon name="check" size={16} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => eliminarNotificacion(item.id)}
                        >
                            <LinearGradient
                                colors={['#FF5252', '#FF7B7B']}
                                style={styles.gradientButtonSmall}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.actionButtonText}>Eliminar</Text>
                                <Icon name="delete" size={16} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
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
                    <Text style={styles.headerTitle}>Notificaciones</Text>
                    {notificaciones.length > 0 && (
                        <Text style={styles.notificationCount}>
                            {notificaciones.filter(n => !n.seen).length} sin leer
                        </Text>
                    )}
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={obtenerNotificaciones}
                    >
                        <Icon name="refresh" size={24} color="#FFF" />
                    </TouchableOpacity>

                    {notificaciones.filter(n => !n.seen).length > 0 && (
                        <TouchableOpacity
                            style={styles.markAllButton}
                            onPress={marcarTodasComoVistas}
                        >
                            <Icon name="done-all" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )}
                    
                    {notificaciones.filter(n => n.seen).length > 0 && (
                        <TouchableOpacity
                            style={styles.deleteAllButton}
                            onPress={eliminarTodasLeidas}
                        >
                            <Icon name="delete-sweep" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3A7BD5" />
                        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notificaciones}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={obtenerNotificaciones}
                                colors={['#3A7BD5']}
                                tintColor="#3A7BD5"
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Icon name="notifications-off" size={60} color="#CFD8DC" />
                                <Text style={styles.emptyTitle}>No hay notificaciones</Text>
                                <Text style={styles.emptySubtitle}>
                                    Cuando tengas nuevas notificaciones, aparecerán aquí
                                </Text>
                                <TouchableOpacity
                                    style={styles.refreshEmptyButton}
                                    onPress={obtenerNotificaciones}
                                >
                                    <Text style={styles.refreshEmptyText}>Actualizar</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        contentContainerStyle={notificaciones.length === 0 && styles.emptyListContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Modal de detalles de notificación */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {selectedNotification && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={[
                                        styles.modalIcon,
                                        { backgroundColor: obtenerIcono(selectedNotification).color }
                                    ]}>
                                        <Icon
                                            name={obtenerIcono(selectedNotification).name}
                                            size={24}
                                            color="#FFF"
                                        />
                                    </View>
                                    <Text style={styles.modalTitle}>Detalles de notificación</Text>
                                    <TouchableOpacity 
                                        style={styles.closeButton}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Icon name="close" size={24} color="#78909C" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.modalBody}>
                                    <Text style={styles.modalMessage}>
                                        {selectedNotification.message}
                                    </Text>
                                    
                                    <Text style={styles.modalDate}>
                                        {formatearFecha(selectedNotification.date)}
                                    </Text>
                                    
                                    {selectedNotification.detalles && (
                                        <View style={styles.detallesContainer}>
                                            <Text style={styles.detallesTitle}>Cambios realizados:</Text>
                                            <Text style={styles.detallesText}>
                                                {selectedNotification.detalles}
                                            </Text>
                                        </View>
                                    )}
                                    
                                    {selectedNotification.estado && (
                                        <View style={styles.estadoContainer}>
                                            <Text style={styles.estadoTitle}>Estado:</Text>
                                            <View style={[
                                                styles.estadoBadge,
                                                { backgroundColor: obtenerIcono(selectedNotification).color }
                                            ]}>
                                                <Text style={styles.estadoText}>
                                                    {selectedNotification.estado}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                                
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalButton}
                                        onPress={() => eliminarNotificacion(selectedNotification.id)}
                                    >
                                        <LinearGradient
                                            colors={['#FF5252', '#FF7B7B']}
                                            style={styles.modalGradientButton}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <Text style={styles.modalButtonText}>Eliminar</Text>
                                            <Icon name="delete" size={18} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={styles.modalButtonSecondary}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={styles.modalButtonSecondaryText}>Cerrar</Text>
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
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
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
        marginRight: 10,
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
    notificationCount: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markAllButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteAllButton: {
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
    notificationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#3A7BD5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
    },
    unseenCard: {
        borderColor: 'rgba(58, 123, 213, 0.3)',
    },
    seenCard: {
        borderColor: 'rgba(58, 123, 213, 0.1)',
        opacity: 0.8,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    notificationContent: {
        flex: 1,
    },
    notificationMessage: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: 6,
    },
    unseenText: {
        color: '#2C3E50',
    },
    seenText: {
        color: '#78909C',
    },
    notificationDate: {
        fontSize: 13,
        color: '#78909C',
        fontWeight: '500',
    },
    unreadDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF5252',
        marginLeft: 8,
        marginTop: 4,
    },
    notificationActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    actionButton: {
        borderRadius: 12,
        overflow: 'hidden',
        flex: 1,
    },
    deleteButton: {
        borderRadius: 12,
        overflow: 'hidden',
        flex: 1,
    },
    gradientButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        gap: 6,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
    emptyListContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
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
        marginBottom: 24,
    },
    refreshEmptyButton: {
        backgroundColor: '#3A7BD5',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    refreshEmptyText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    // Estilos del modal
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#2C3E50',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        marginBottom: 20,
    },
    modalMessage: {
        fontSize: 16,
        color: '#2C3E50',
        marginBottom: 10,
        lineHeight: 22,
    },
    modalDate: {
        fontSize: 14,
        color: '#78909C',
        marginBottom: 15,
    },
    detallesContainer: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    detallesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3A7BD5',
        marginBottom: 5,
    },
    detallesText: {
        fontSize: 14,
        color: '#546E7A',
        lineHeight: 20,
    },
    estadoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    estadoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3A7BD5',
        marginRight: 10,
    },
    estadoBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    estadoText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        marginRight: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalGradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 6,
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    modalButtonSecondary: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3A7BD5',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
    },
    modalButtonSecondaryText: {
        color: '#3A7BD5',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default Notificaciones;