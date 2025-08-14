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
      <Stack.Navigator 
        initialRouteName="Login" 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ animation: 'fade' }}
        />
        <Stack.Screen 
          name="HomeGerente" 
          component={HomeGerente} 
        />
        <Stack.Screen 
          name="HomeMiembro" 
          component={HomeMiembro} 
        />
        <Stack.Screen 
          name="TareasProyecto" 
          component={TareasProyecto} 
          options={({ route }) => ({ 
            title: `Tareas - ${route.params?.proyectoNombre || 'Proyecto'}`,
            headerShown: true,
            headerBackTitleVisible: false
          })}
        />
        <Stack.Screen 
          name="TareasProyectoMiembro" 
          component={TareasProyectoMiembro} 
          options={({ route }) => ({
            title: `Mis Tareas - ${route.params?.proyectoNombre || 'Proyecto'}`,
            headerShown: true,
            headerBackTitleVisible: false
          })}
        />
        <Stack.Screen 
          name="SubtareasTarea" 
          component={SubtareasTarea} 
          options={({ route }) => ({
            title: `Subtareas - ${route.params?.tareaNombre || 'Tarea'}`,
            headerShown: true,
            headerBackTitleVisible: false
          })}
        />
        <Stack.Screen 
          name="HistorialProyecto" 
          component={HistorialProyecto} 
          options={({ route }) => ({
            title: `Historial - ${route.params?.proyectoNombre || 'Proyecto'}`,
            headerShown: true,
            headerBackTitleVisible: false
          })}
        />
        <Stack.Screen 
          name="SubtareasMiembro" 
          component={SubtareasMiembro} 
          options={({ route }) => ({
            title: `Subtareas - ${route.params?.tareaNombre || 'Tarea'}`,
            headerShown: true,
            headerBackTitleVisible: false
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
