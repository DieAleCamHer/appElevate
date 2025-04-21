// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeGerente from './screens/HomeGerente';
import TareasProyecto from './screens/TareasProyecto';
import SubtareasTarea from './screens/SubtareasTarea';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="HomeGerente" component={HomeGerente} />
        <Stack.Screen name="TareasProyecto" component={TareasProyecto} />
        <Stack.Screen name="SubtareasTarea" component={SubtareasTarea} />
        <Stack.Screen name="HomeMiembro" component={() => <></>} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}