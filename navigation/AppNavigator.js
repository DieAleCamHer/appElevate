// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Pantallas importadas
import LoginScreen from './screens/LoginScreen';
import HomeGerente from './screens/HomeGerente';
import HomeMiembro from './screens/HomeMiembro';
import TareasProyecto from './screens/TareasProyecto';
import TareasProyectoMiembro from './screens/TareasProyectoMiembro';
import SubtareasTarea from './screens/SubtareasTarea';
import HistorialProyecto from './screens/HistorialProyecto';
import SubtareasMiembro from './screens/SubtareasMiembro';  
  

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="HomeGerente" component={HomeGerente} />
        <Stack.Screen name="HomeMiembro" component={HomeMiembro} />
        <Stack.Screen name="TareasProyecto" component={TareasProyecto} />
        <Stack.Screen name="TareasProyectoMiembro" component={TareasProyectoMiembro} />
        <Stack.Screen name="SubtareasTarea" component={SubtareasTarea} />
        <Stack.Screen name="HistorialProyecto" component={HistorialProyecto} />
        <Stack.Screen name="SubtareasMiembro" component={SubtareasMiembro} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
