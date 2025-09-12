


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './components/HomeScreen';
import SearchScreen from './components/SearchScreen';
import RoomsScreen from './components/RoomsScreen';




const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Forside' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Søg' }} />
        <Stack.Screen name="Rooms" component={RoomsScreen} options={{ title: 'Rum' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

