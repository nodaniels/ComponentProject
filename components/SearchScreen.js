import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import styles from './styles';
import PDFViewer from './PDFViewer';

const SearchScreen = ({ navigation, route }) => {
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);

  const buildingId = route?.params?.buildingId || 'unknown';
  const buildingName = route?.params?.buildingName || 'Unknown Building';
  const floors = route?.params?.floors || [];
  const currentFloor = floors[selectedFloor] || null;

  const runSearch = () => {
    const q = (search || '').trim();
    setSearchText(q);
    setMatchIndex(0);
  };

  const handleMatchChange = (matches, currentIndex) => {
    setMatchCount(matches.length);
    setMatchIndex(currentIndex);
  };

  const nextMatch = () => {
    if (matchCount > 0) {
      setMatchIndex((prev) => (prev + 1) % matchCount);
    }
  };

  const prevMatch = () => {
    if (matchCount > 0) {
      setMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{buildingName}</Text>
      
      {/* Floor selection */}
      <View style={{ marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Etage:</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {floors.map((floor, index) => (
            <TouchableOpacity
              key={floor.id}
              onPress={() => {
                setSelectedFloor(index);
                setMatchIndex(0);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: selectedFloor === index ? '#007AFF' : '#f0f0f0',
                borderRadius: 6,
                minWidth: 40,
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: selectedFloor === index ? 'white' : 'black',
                fontWeight: selectedFloor === index ? 'bold' : 'normal',
                fontSize: 16
              }}>
                {floor.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search input */}
      <Text style={{ fontSize: 18, marginBottom: 16 }}>Søg på et rum</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Indtast rumnavn..."
        value={search}
        onChangeText={setSearch}
      />
      <Button title="Søg" onPress={runSearch} style={styles.button} />

      {/* Search results info */}
      <View style={{ marginTop: 10, alignItems: 'center' }}>
        {searchText ? (
          <>
            {matchCount > 0 ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ marginBottom: 8 }}>
                  Fandt {matchCount} match{matchCount !== 1 ? 'es' : ''} på {currentFloor?.name || 'denne etage'}
                  {matchCount > 1 && ` (${matchIndex + 1} af ${matchCount})`}
                </Text>
                {matchCount > 1 && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={prevMatch}
                      style={{ 
                        paddingHorizontal: 16, 
                        paddingVertical: 8, 
                        backgroundColor: '#007AFF', 
                        borderRadius: 8,
                        minWidth: 80,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '500' }}>Forrige</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={nextMatch}
                      style={{ 
                        paddingHorizontal: 16, 
                        paddingVertical: 8, 
                        backgroundColor: '#007AFF', 
                        borderRadius: 8,
                        minWidth: 80,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '500' }}>Næste</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ color: '#888' }}>Ingen match for "{searchText}" på {currentFloor?.name || 'denne etage'}.</Text>
            )}
          </>
        ) : null}
      </View>

      {/* PDF Viewer for current floor only */}
      <View style={styles.mapContainer}>
        {currentFloor ? (
          <PDFViewer
            buildingId={buildingId}
            fileName={currentFloor.pdfFile}
            fileType="pdf"
            pdfAssetModule={currentFloor.pdfModule}
            searchText={searchText}
            onMatchChange={handleMatchChange}
            currentMatchIndex={matchIndex}
          />
        ) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text>Ingen etage valgt</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default SearchScreen;