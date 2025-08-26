import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  Image, Animated, KeyboardAvoidingView, Platform, StatusBar,
  Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const LoginScreen = ({ navigation }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState(null);

  const passwordRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current; // Iniciar en 1 para evitar parpadeo

  useEffect(() => {
    // Limpiar formulario cuando la pantalla recibe foco
    const unsubscribe = navigation.addListener('focus', () => {
      setForm({ username: '', password: '' });
      setIsLoading(false);
      setActiveField(null);
      Keyboard.dismiss();
    });

    return unsubscribe;
  }, [navigation]);

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async () => {
    if (isLoading) return; // Prevenir múltiples clics
    
    if (!form.username || !form.password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const email = `${form.username}@empresa.com`;

    try {
      setIsLoading(true);
      Keyboard.dismiss(); // Ocultar teclado al iniciar sesión
      
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
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/logo.png')} 
                style={styles.logo} 
                resizeMode="contain" 
              />
            </View>

            <View style={styles.formContainer}>
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
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    tintColor: '#00796B',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#00796B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00796B',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#00838F',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    height: 46,
    fontSize: 16,
    color: '#263238',
    fontWeight: '500',
    paddingBottom: 8,
  },
  inputLine: {
    height: 1.5,
    backgroundColor: '#E0F2F1',
  },
  inputLineActive: {
    backgroundColor: '#00796B',
    height: 2,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
    shadowColor: '#00796B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default LoginScreen;