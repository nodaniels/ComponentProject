
import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import styles from './styles';
import BuildingSvgComponent from './BuildingSvgComponent';


const SearchScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Søg på et rum</Text>
      <TextInput
        style={styles.input}
        placeholder="Indtast rumnavn..."
        value={search}
        onChangeText={setSearch}
      />
      <Button title="Søg" onPress={() => navigation.navigate('Rooms', { room: search })} style={styles.button} />
      <View style={styles.svgContainer}>
        <BuildingSvgComponent highlightRoom={search} width={350} height={120} />
      </View>
    </View>
  );
};


export default SearchScreen;
