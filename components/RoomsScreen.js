
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import BuildingSvgComponent from './BuildingSvgComponent';

const ROOMS = [
  { id: 'A.1.01', name: 'A.1.01' },
  { id: 'B.2.01', name: 'B.2.01' },
];

const RoomsScreen = ({ route }) => {
  const highlightRoom = route?.params?.room;
  // Beregn farver til rektangler i SVG
  const getRectFill = (roomId) => (highlightRoom === roomId ? 'lightgreen' : '#D9D9D9');

  // SVG override props
  const svgProps = {
    width: 350,
    height: 120,
    // override farver på de to rum
    rect: [
      { key: 'left', x: 0.5, y: 0.5, width: 970, height: 606, fill: getRectFill('A.1.01'), stroke: 'black' },
      { key: 'right', x: 971.5, y: 0.5, width: 835, height: 606, fill: getRectFill('B.2.01'), stroke: 'black' },
    ],
  };

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
      <View style={{ marginTop: 30 }}>
        <BuildingSvgComponent highlightRoom={highlightRoom} width={350} height={120} />
      </View>
    </View>
  );
};


export default RoomsScreen;
