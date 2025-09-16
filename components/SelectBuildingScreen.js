import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import styles from './styles';

let BUILDINGS;
try {
  // Load buildings with floors support
  BUILDINGS = require('../assets/buildings-with-floors').default;
} catch (e) {
  // Fallback to old structure if new file doesn't exist
  try {
    BUILDINGS = require('../assets/buildings').default.map(building => ({
      id: building.id,
      name: building.name,
      floors: [{
        id: 'default',
        name: 'Etage',
        pdfFile: building.pdfFile,
        pdfModule: null // Will be handled in SearchScreen
      }]
    }));
  } catch (e2) {
    console.warn('No buildings found');
    BUILDINGS = [];
  }
}

const SelectBuildingScreen = ({ navigation }) => {
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginVertical: 6,
        width: 280,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
      onPress={() => navigation.navigate('Search', { 
        buildingId: item.id,
        buildingName: item.name,
        floors: item.floors
      })}
    >
      <Text style={{ fontSize: 16 }}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 22 }]}>Vælg bygning</Text>
      <FlatList
        data={BUILDINGS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ alignItems: 'center', paddingVertical: 8 }}
      />
    </View>
  );
};

export default SelectBuildingScreen;
