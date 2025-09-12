import React from 'react';
import { View, Text, FlatList } from 'react-native';


const ROOMS = [
  { id: 'A.1.01', name: 'A.1.01' },
  { id: 'A.1.02', name: 'A.1.02' },
  { id: 'A.1.03', name: 'A.1.03' },
  { id: 'B.2.01', name: 'B.2.01' },
  { id: 'B.2.02', name: 'B.2.02' },
];

const RoomsScreen = ({ route }) => {
  const highlightRoom = route?.params?.room;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Alle rum</Text>
      <FlatList
        data={ROOMS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text style={{
            fontSize: 18,
            padding: 10,
            marginVertical: 4,
            backgroundColor: highlightRoom === item.id ? 'lightgreen' : '#fff',
            borderRadius: 5,
            width: 120,
            textAlign: 'center',
            color: highlightRoom === item.id ? '#222' : '#000',
            fontWeight: highlightRoom === item.id ? 'bold' : 'normal',
          }}>{item.name}</Text>
        )}
      />
    </View>
  );
};


export default RoomsScreen;
