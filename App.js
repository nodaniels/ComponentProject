


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './components/HomeScreen';
import SelectBuildingScreen from './components/SelectBuildingScreen';
import SearchScreen from './components/SearchScreen';
import RoomsScreen from './components/RoomsScreen';




const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SelectBuilding" component={SelectBuildingScreen} options={{ title: 'Vælg bygning' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Søg på lokale' }} />
        <Stack.Screen name="Rooms" component={RoomsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

