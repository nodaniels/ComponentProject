
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import styles from './styles';
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
    <View style={styles.container}>
      <Text style={styles.title}>Alle rum</Text>
      <FlatList
        data={ROOMS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text style={[
            styles.room,
            highlightRoom === item.id && styles.highlight,
          ]}>{item.name}</Text>
        )}
      />
      <View style={styles.svgContainer}>
        <BuildingSvgComponent highlightRoom={highlightRoom} width={350} height={120} />
      </View>
    </View>
  );
};


export default RoomsScreen;
