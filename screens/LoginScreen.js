// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    try {
      // Paso 1: Convertir username a correo interno
      const email = username + '@empresa.com';

      // Paso 2: Autenticación con correo y contraseña
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Paso 3: Consultar datos del usuario en Firestore
      const userDocRef = doc(db, 'usuarios', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        Alert.alert('Error', 'No se encontró la información del usuario.');
        return;
      }

      const userData = userDocSnap.data();
      const rol = userData.rol;

      // Paso 4: Navegar según rol
      if (rol === 'gerente') {
        navigation.navigate('HomeGerente', { userId });
      } else if (rol === 'miembro') {
        navigation.navigate('HomeMiembro', { userId });
      } else {
        Alert.alert('Error', 'Rol desconocido.');
      }

    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Credenciales incorrectas o problema de conexión.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      
      <TextInput
        placeholder="Nombre de usuario"
        style={styles.input}
        onChangeText={setUsername}
        value={username}
      />
      
      <TextInput
        placeholder="Contraseña"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
        value={password}
      />
      
      <Button title="Ingresar" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 100,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
    borderRadius: 5
  }
});

export default LoginScreen;
