
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
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
    // Reset selection for a new query
    setMatchIndex(0);
  };

  // Use useCallback to prevent onMatchChange from being recreated on every render
  const handleMatchChange = useCallback((rooms) => {
    if (rooms && Array.isArray(rooms)) {
      const count = rooms.length;
      const ids = rooms.map(room => room.id || room.text);
      setMatchInfo({ count, ids });
    }
  }, []); // Empty dependency array to prevent recreation

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
              </Text>
              {matchInfo.count > 1 && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => matchInfo.count > 0 && setMatchIndex((i) => (i - 1 + matchInfo.count) % matchInfo.count)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 6 }}
                  >
                    <Text>Forrige</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => matchInfo.count > 0 && setMatchIndex((i) => (i + 1) % matchInfo.count)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 6 }}
                  >
                    <Text>Næste</Text>
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
        />
      </View>
    </View>
  );
};


export default SearchScreen;
