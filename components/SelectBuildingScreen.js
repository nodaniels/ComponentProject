import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import styles from './styles';
let BUILDINGS;
try {
  // Load buildings from generated list (PDF files)
  // eslint-disable-next-line global-require
  BUILDINGS = require('../assets/buildings').default;
} catch (e) {
  // Fallback to empty list if no buildings file exists
  console.warn('No buildings.js found, run: node scripts/generate-buildings.js');
  BUILDINGS = [];
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
        fileType: item.type,
        fileName: item.pdfFile
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
