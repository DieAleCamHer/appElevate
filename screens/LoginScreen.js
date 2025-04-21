// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    try {
      // Paso 1: Buscar el username en la colección "usuarios"
      const q = query(collection(db, 'usuarios'), where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert('Error', 'Usuario no encontrado.');
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const userId = querySnapshot.docs[0].id;
      const email = userData.username + '@empresa.com'; // Reglas internas
      const rol = userData.rol;

      // Paso 2: Iniciar sesión con email asociado + contraseña
      await signInWithEmailAndPassword(auth, email, password);

      // Paso 3: Redirigir según rol
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
