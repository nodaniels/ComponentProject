import React from 'react';
import { View, Text, Button } from 'react-native';


const HomeScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24, marginBottom: 30 }}>Velkommen til Bygningsnavigation</Text>
      <Button title="Søg efter rum" onPress={() => navigation.navigate('Search')} />
      <Button title="Se alle rum" onPress={() => navigation.navigate('Rooms')} />
    </View>
  );
};


export default HomeScreen;
