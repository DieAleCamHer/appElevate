import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  Image, Animated, AppState, KeyboardAvoidingView, Platform, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const LoginScreen = ({ navigation }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const initAnimations = () => {
      fadeAnim.setValue(0);
      cardScale.setValue(0.95);
      inputFocusAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, friction: 5, useNativeDriver: true })
      ]).start();
    };

    initAnimations();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        initAnimations();
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    Animated.timing(inputFocusAnim, {
      toValue: activeField ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [activeField]);

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const email = `${form.username}@empresa.com`;

    try {
      setIsLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, form.password);
      const userId = cred.user.uid;

      const docRef = doc(db, 'usuarios', userId);
      const userSnap = await getDoc(docRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'Usuario no registrado en Firestore');
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
      console.log(error);
      Alert.alert('Error', 'Credenciales incorrectas o problema de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const inputScale = inputFocusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  return (
    <LinearGradient colors={['#E0F7FA', '#B2EBF2', '#80DEEA']} style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: cardScale }] }]}>
          <Animated.View style={[styles.logoContainer, {
            transform: [{
              translateY: inputFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10]
              })
            }]
          }]}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>

          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
            }]
          }}>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Ingresa a tu cuenta</Text>
          </Animated.View>

          {/* Usuario */}
          <Animated.View style={[styles.inputContainer, activeField === 'username' && styles.inputContainerActive, {
            transform: [{ scale: activeField === 'username' ? inputScale : 1 }]
          }]}>
            <Text style={[styles.inputLabel, activeField === 'username' && styles.inputLabelActive]}>USUARIO</Text>
            <TextInput
              ref={usernameRef}
              style={styles.input}
              value={form.username}
              onChangeText={(text) => handleChange('username', text)}
              placeholder="nombre@empresa.com"
              placeholderTextColor="#90A4AE"
              onFocus={() => setActiveField('username')}
              onBlur={() => setActiveField(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current.focus()}
              editable={!isLoading}
            />
          </Animated.View>

          {/* Contraseña */}
          <Animated.View style={[styles.inputContainer, activeField === 'password' && styles.inputContainerActive, {
            transform: [{ scale: activeField === 'password' ? inputScale : 1 }]
          }]}>
            <Text style={[styles.inputLabel, activeField === 'password' && styles.inputLabelActive]}>CONTRASEÑA</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={form.password}
              onChangeText={(text) => handleChange('password', text)}
              placeholder="••••••••"
              placeholderTextColor="#90A4AE"
              onFocus={() => setActiveField('password')}
              onBlur={() => setActiveField(null)}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />
          </Animated.View>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#7C4DFF', '#651FFF']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Animated.Text style={[styles.buttonText, {
                transform: [{
                  scale: isLoading ? 1 : inputFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05]
                  })
                }]
              }]}>
                {isLoading ? 'INGRESANDO...' : 'INGRESAR →'}
              </Animated.Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword} disabled={isLoading}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 28,
    padding: 36,
    shadowColor: '#00796B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 150,
    height: 150,
    tintColor: '#00796B',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00796B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#00838F',
    textAlign: 'center',
    marginBottom: 36,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 28,
  },
  inputContainerActive: {
    zIndex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#00838F',
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  inputLabelActive: {
    color: '#7C4DFF',
  },
  input: {
    height: 50,
    fontSize: 16,
    color: '#263238',
    paddingBottom: 8,
    fontWeight: '500',
  },
  inputLine: {
    height: 2,
    backgroundColor: '#B2DFDB',
    marginTop: 6,
  },
  inputLineActive: {
    backgroundColor: '#7C4DFF',
    height: 3,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 28,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    marginTop: 24,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    color: '#7C4DFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen; 