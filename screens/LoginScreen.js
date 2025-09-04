import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  Image, Animated, KeyboardAvoidingView, Platform, StatusBar,
  Keyboard, TouchableWithoutFeedback, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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

const LoginScreen = ({ navigation }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [orientation, setOrientation] = useState(isPortrait() ? 'portrait' : 'landscape');

  const passwordRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Listener para cambios de orientación
    const dimensionHandler = Dimensions.addEventListener('change', () => {
      setOrientation(isPortrait() ? 'portrait' : 'landscape');
    });

    // Limpiar formulario cuando la pantalla recibe foco
    const unsubscribe = navigation.addListener('focus', () => {
      setForm({ username: '', password: '' });
      setIsLoading(false);
      setActiveField(null);
      Keyboard.dismiss();
    });

    return () => {
      dimensionHandler?.remove();
      unsubscribe();
    };
  }, [navigation]);

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async () => {
    if (isLoading) return;
    
    if (!form.username || !form.password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const email = `${form.username}@empresa.com`;

    try {
      setIsLoading(true);
      Keyboard.dismiss();
      
      const cred = await signInWithEmailAndPassword(auth, email, form.password);
      const userId = cred.user.uid;

      const docRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(docRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'Usuario no registrado en Firestore');
        setIsLoading(false);
        return;
      }

      const userData = userSnap.data();
      
      if (userData.rol === 'gerente') {
        navigation.navigate('HomeGerente', { userId });
      } else if (userData.rol === 'miembro') {
        navigation.navigate('HomeMiembro', { userId });
      } else {
        Alert.alert('Error', 'Rol desconocido');
      }

    } catch (error) {
      console.log('Error completo:', error);
      setIsLoading(false);
      if (error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Credenciales incorrectas');
      } else {
        Alert.alert('Error', 'Problema de conexión');
      }
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setActiveField(null);
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <LinearGradient 
        colors={['#E0F7FA', '#B2EBF2']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#E0F7FA" />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.container, orientation === 'landscape' && styles.landscapeContainer]}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[
            styles.content, 
            { opacity: fadeAnim },
            orientation === 'landscape' && styles.landscapeContent
          ]}>
            <View style={[
              styles.logoContainer, 
              orientation === 'landscape' && styles.landscapeLogoContainer
            ]}>
              <Image 
                source={require('../assets/logo.png')} 
                style={styles.logo} 
                resizeMode="contain" 
              />
            </View>

            <View style={[
              styles.formContainer, 
              orientation === 'landscape' && styles.landscapeFormContainer
            ]}>
              <Text style={styles.title}>Inicio de Sesión</Text>
              
              {/* Campo de Usuario */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Usuario</Text>
                <TextInput
                  style={styles.input}
                  value={form.username}
                  onChangeText={(text) => handleChange('username', text)}
                  placeholder="Ingresa tu usuario"
                  placeholderTextColor="#90A4AE"
                  onFocus={() => setActiveField('username')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current.focus()}
                  editable={!isLoading}
                />
                <View style={[
                  styles.inputLine,
                  activeField === 'username' && styles.inputLineActive
                ]} />
              </View>

              {/* Campo de Contraseña */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={form.password}
                  onChangeText={(text) => handleChange('password', text)}
                  placeholder="Ingresa tu contraseña"
                  placeholderTextColor="#90A4AE"
                  onFocus={() => setActiveField('password')}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                />
                <View style={[
                  styles.inputLine,
                  activeField === 'password' && styles.inputLineActive
                ]} />
              </View>

              {/* Botón de Ingreso */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00796B', '#00897B']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'INGRESANDO...' : 'INGRESAR'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: moderateScale(24),
  },
  landscapeContainer: {
    paddingHorizontal: moderateScale(12),
  },
  content: {
    paddingHorizontal: moderateScale(16),
  },
  landscapeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  landscapeLogoContainer: {
    flex: 1,
    marginRight: moderateScale(20),
    marginBottom: 0,
  },
  logo: {
    width: moderateScale(120),
    height: moderateScale(120),
    tintColor: '#00796B',
    resizeMode: 'contain',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: moderateScale(20),
    padding: moderateScale(24),
    shadowColor: '#00796B',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(12),
    elevation: 5,
    marginHorizontal: width < 350 ? moderateScale(10) : 0,
  },
  landscapeFormContainer: {
    flex: 2,
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#00796B',
    textAlign: 'center',
    marginBottom: verticalScale(24),
    ...(width < 350 && { fontSize: moderateScale(20) }),
  },
  inputContainer: {
    marginBottom: verticalScale(20),
  },
  inputLabel: {
    fontSize: moderateScale(15),
    color: '#00838F',
    marginBottom: verticalScale(8),
    fontWeight: '600',
  },
  input: {
    height: verticalScale(46),
    fontSize: moderateScale(16),
    color: '#263238',
    fontWeight: '500',
    paddingBottom: verticalScale(8),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputLine: {
    height: Platform.select({ ios: 1, android: 1.5 }),
    backgroundColor: '#E0F2F1',
  },
  inputLineActive: {
    backgroundColor: '#00796B',
    height: Platform.select({ ios: 2, android: 2 }),
  },
  button: {
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    marginTop: verticalScale(24),
    shadowColor: '#00796B',
    shadowOffset: { width: 0, height: verticalScale(3) },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(6),
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '700',
    letterSpacing: moderateScale(0.5),
  },
});

export default LoginScreen;