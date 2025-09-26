
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
