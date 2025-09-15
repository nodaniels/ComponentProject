
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import styles from './styles';
import MapViewer from './MapViewer';


const SearchScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [committed, setCommitted] = useState('');
  const [matchInfo, setMatchInfo] = useState({ count: 0, ids: [] });
  const [matchIndex, setMatchIndex] = useState(0);
  const [debugWalls, setDebugWalls] = useState(false);
  const [debugLabels, setDebugLabels] = useState(false);
  

  const runSearch = () => {
    const q = (search || '').trim();
    setCommitted(q);
    // Reset selection for a new query
    setMatchIndex(0);
  };

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

      {/* Debug toggles */}
      <View style={{ marginTop: 10, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setDebugWalls((v) => !v)} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: debugWalls?'#ffe3f0':'#eee', borderRadius: 6 }}>
            <Text>Vægge</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDebugLabels((v) => !v)} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: debugLabels?'#e8eaff':'#eee', borderRadius: 6 }}>
            <Text>Labels</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setMatchInfo((m) => ({ ...m }))} style={{ display: 'none' }}>
          <Text />
        </TouchableOpacity>
      </View>

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
        <MapViewer
          width={350}
          height={480}
          highlightRoom={committed}
          onMatchChange={(info) => setMatchInfo(info)}
          matchIndex={Math.min(Math.max(0, matchIndex), Math.max(0, matchInfo.count - 1))}
          debugLabels={debugLabels}
          debugWalls={debugWalls}
        />
      </View>
    </View>
  );
};


export default SearchScreen;
