import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity } from 'react-native';
import styles from './styles';
import PDFViewer from './PDFViewer';

const SearchScreen = ({ navigation, route }) => {
  const [search, setSearch] = useState('');
  const [committed, setCommitted] = useState('');
  const [matchInfo, setMatchInfo] = useState({ count: 0, ids: [] });
  const [matchIndex, setMatchIndex] = useState(0);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [showingEntrance, setShowingEntrance] = useState(true);
  const [targetFloor, setTargetFloor] = useState(null);
  const [allFloorRooms, setAllFloorRooms] = useState({}); // Store rooms data for all floors
  const [searchingAcrossFloors, setSearchingAcrossFloors] = useState(false);

  const buildingId = route?.params?.buildingId || 'unknown';
  const buildingName = route?.params?.buildingName || 'Unknown Building';
  const floors = route?.params?.floors || [];
  const currentFloor = floors[selectedFloor] || null;

  const runSearch = () => {
    const q = (search || '').trim();
    setCommitted(q);
    setMatchIndex(0);
    setSearchingAcrossFloors(true);
    
    // Don't automatically reset to floor 0 - we'll let the search determine the floor
    setShowingEntrance(true);
    setTargetFloor(null);
  };

  const handleMatchChange = useCallback((allMatches, currentIndex, floorIndex = selectedFloor) => {
    // Store room data for this floor
    if (allMatches && Array.isArray(allMatches)) {
      setAllFloorRooms(prev => ({
        ...prev,
        [floorIndex]: allMatches
      }));
    }

    // If we're searching across floors, find the room on any floor
    if (searchingAcrossFloors && committed) {
      const searchTerm = committed.toLowerCase().trim();
      let foundRoom = null;
      let foundFloorIndex = -1;
      let allFoundMatches = [];

      // Search through all collected floor data
      Object.keys(allFloorRooms).forEach(floorIdx => {
        const floorRooms = allFloorRooms[floorIdx] || [];
        const matches = floorRooms.filter(room => 
          room.id.toLowerCase().includes(searchTerm) || 
          room.text.toLowerCase().includes(searchTerm)
        );
        
        if (matches.length > 0) {
          allFoundMatches = [...allFoundMatches, ...matches.map(m => ({ ...m, floorIndex: parseInt(floorIdx) }))];
          if (foundRoom === null) {
            foundRoom = matches[0];
            foundFloorIndex = parseInt(floorIdx);
          }
        }
      });

      // If we found a room and we're not already on that floor, navigate to it
      if (foundRoom && foundFloorIndex !== -1 && foundFloorIndex !== selectedFloor) {
        setSelectedFloor(foundFloorIndex);
        setSearchingAcrossFloors(false);
        
        // Update match info with all found matches
        const ids = allFoundMatches.map(room => room.id || room.text);
        setMatchInfo({ count: allFoundMatches.length, ids });
        return;
      }
    }

    // Regular match handling for current floor
    if (allMatches && Array.isArray(allMatches)) {
      const count = allMatches.length;
      const ids = allMatches.map(room => room.id || room.text);
      setMatchInfo({ count, ids });
      
      // Stop searching across floors once we have results
      if (searchingAcrossFloors) {
        setSearchingAcrossFloors(false);
      }
    } else {
      setMatchInfo({ count: 0, ids: [] });
    }
  }, [searchingAcrossFloors, committed, selectedFloor, allFloorRooms]);

  const goToTargetFloor = () => {
    if (targetFloor !== null && targetFloor < floors.length) {
      setSelectedFloor(targetFloor);
      setShowingEntrance(false);
      setTargetFloor(null);
    }
  };

  // Get entrance coordinates from ground floor (stueetage)
  const getEntranceCoordinates = useCallback(() => {
    const groundFloorRooms = allFloorRooms[0] || []; // Ground floor is index 0
    if (!committed || !groundFloorRooms.length) return null;

    const searchTerm = committed.toLowerCase().trim();
    
    // Find the room on ground floor to get entrance coordinates
    const matchingRoom = groundFloorRooms.find(room => 
      room.id.toLowerCase().includes(searchTerm) || 
      room.text.toLowerCase().includes(searchTerm)
    );

    return matchingRoom ? { x: matchingRoom.x, y: matchingRoom.y } : null;
  }, [allFloorRooms, committed]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{buildingName}</Text>
      
      <View style={{ marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Etage:</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {floors.map((floor, index) => (
            <TouchableOpacity
              key={floor.id}
              onPress={() => {
                setSelectedFloor(index);
                setShowingEntrance(false);
                setTargetFloor(null);
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

      <Text style={{ fontSize: 18, marginBottom: 16 }}>Søg på et rum</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Indtast rumnavn..."
        value={search}
        onChangeText={setSearch}
      />
      <Button title="Søg" onPress={runSearch} style={styles.button} />

      <View style={{ marginTop: 10, alignItems: 'center' }}>
        {committed ? (
          <>
            {showingEntrance && selectedFloor === 0 && (
              <View style={{ marginBottom: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FF9800', marginBottom: 8 }}>
                  Nærmeste indgang til "{committed}":
                </Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                  🟠 Orange prik viser indgangen på stueetagen
                </Text>
              </View>
            )}

            {showingEntrance && targetFloor !== null && targetFloor < floors.length && (
              <TouchableOpacity
                onPress={goToTargetFloor}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: '#4CAF50',
                  borderRadius: 8,
                  marginBottom: 12
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  Gå til {floors[targetFloor]?.fullName} → Se lokalet
                </Text>
              </TouchableOpacity>
            )}

            {matchInfo.count > 0 ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ marginBottom: 8 }}>
                  {!showingEntrance ? 'Fundet' : 'Indgang til'} {matchInfo.count} match{matchInfo.count !== 1 ? 'es' : ''}
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
              <Text style={{ color: '#888' }}>Ingen match for "{committed}".</Text>
            )}
          </>
        ) : null}
      </View>

      <View style={styles.mapContainer}>
        {/* Hidden PDFViewers to preload all floors for cross-floor search */}
        {floors.map((floor, floorIndex) => (
          floorIndex !== selectedFloor && (
            <View key={`hidden-${floor.id}`} style={{ position: 'absolute', left: -10000, top: -10000, width: 1, height: 1, overflow: 'hidden' }}>
              <PDFViewer
                buildingId={buildingId}
                fileName={floor.pdfFile}
                fileType="pdf"
                pdfAssetModule={floor.pdfModule}
                searchText={searchingAcrossFloors ? committed : ''}
                onMatchChange={(matches, index) => handleMatchChange(matches, index, floorIndex)}
                currentMatchIndex={0}
              />
            </View>
          )
        ))}
        
        {/* Main visible PDFViewer */}
        {currentFloor ? (
          <PDFViewer
            buildingId={buildingId}
            fileName={currentFloor.pdfFile}
            fileType="pdf"
            pdfAssetModule={currentFloor.pdfModule}
            searchText={committed}
            onMatchChange={(matches, index) => handleMatchChange(matches, index, selectedFloor)}
            currentMatchIndex={matchIndex}
            entranceCoordinates={selectedFloor !== 0 ? getEntranceCoordinates() : null}
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
