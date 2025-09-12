import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';


const SearchScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>Søg på et rum</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, width: 200, marginBottom: 20, backgroundColor: '#fff' }}
        placeholder="Indtast rumnavn..."
        value={search}
        onChangeText={setSearch}
      />
      <Button title="Søg" onPress={() => navigation.navigate('Rooms', { room: search })} />
    </View>
  );
};


export default SearchScreen;
