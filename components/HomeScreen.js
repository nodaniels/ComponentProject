import React from 'react';
import { View, Text, Button } from 'react-native';
import styles from './styles';


const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 24, marginBottom: 30 }]}>Velkommen til Bygningsnavigation</Text>
  <Button title="Vælg bygning" onPress={() => navigation.navigate('SelectBuilding')} style={styles.button} />
  <Button title="Se alle rum (demo)" onPress={() => navigation.navigate('Rooms')} style={styles.button} />
    </View>
  );
};


export default HomeScreen;
