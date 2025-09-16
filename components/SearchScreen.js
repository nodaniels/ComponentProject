
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import styles from './styles';
import PDFViewer from './PDFViewer';

const SearchScreen = ({ navigation, route }) => {
  const [search, setSearch] = useState('');
  const [committed, setCommitted] = useState('');
  const [matchInfo, setMatchInfo] = useState({ count: 0, ids: [] });
  const [matchIndex, setMatchIndex] = useState(0);

  const runSearch = () => {
    const q = (search || '').trim();
    setCommitted(q);
    setMatchIndex(0); // Reset to first match for new search
  };

  const handleMatchChange = useCallback((allMatches, currentIndex) => {
    if (allMatches && Array.isArray(allMatches)) {
      const count = allMatches.length;
      const ids = allMatches.map(room => room.id || room.text);
      setMatchInfo({ count, ids });
    } else {
      setMatchInfo({ count: 0, ids: [] });
    }
  }, []);

  // Prefer selected SVG from route; else use first entry from generated buildings list; fallback to a known file.
  // Get building information from route params
  const buildingId = route?.params?.buildingId || 'unknown';
  const fileType = route?.params?.fileType || 'pdf';
  const fileName = route?.params?.fileName || null;

  // Load the PDF asset based on known files
  let pdfAssetModule = null;
  if (fileName && fileName.includes('stueetage_kl_9_cbs_porcelanshaven_21')) {
    pdfAssetModule = require('../assets/bygninger/stueetage_kl_9_cbs_porcelanshaven_21.pdf');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Søg på et rum</Text>
      <TextInput
        style={styles.input}
        placeholder="Indtast rumnavn..."
        value={search}
        onChangeText={setSearch}
      />
      <Button title="Søg" onPress={runSearch} style={styles.button} />

      {/* Match feedback + navigation */}
      <View style={{ marginTop: 10, alignItems: 'center' }}>
        {committed ? (
          matchInfo.count > 0 ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ marginBottom: 8 }}>
                Fundet {matchInfo.count} match{matchInfo.count !== 1 ? 'es' : ''}
                {matchInfo.ids[matchIndex] ? ` — viser: ${matchInfo.ids[matchIndex]}` : ''}
                {` (${matchIndex + 1} af ${matchInfo.count})`}
              </Text>
              {matchInfo.count > 1 && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (matchInfo.count > 1) {
                        setMatchIndex((i) => (i - 1 + matchInfo.count) % matchInfo.count);
                      }
                    }}
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
                    onPress={() => {
                      if (matchInfo.count > 1) {
                        setMatchIndex((i) => (i + 1) % matchInfo.count);
                      }
                    }}
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
            <Text style={{ color: '#888' }}>Ingen match for “{committed}”.</Text>
          )
        ) : null}
      </View>
      <View style={styles.mapContainer}>
        <PDFViewer
          buildingId={buildingId}
          fileName={fileName}
          fileType={fileType}
          pdfAssetModule={pdfAssetModule}
          searchText={committed}
          onMatchChange={handleMatchChange}
          currentMatchIndex={matchIndex}
        />
      </View>
    </View>
  );
};


export default SearchScreen;
