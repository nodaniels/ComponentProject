import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import styles from './styles';
import MapViewer from './MapViewer';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system';

// Screen for processing buildings from bygninger folder
const ProcessBuildingsScreen = ({ navigation }) => {
  const [pendingBuildings, setPendingBuildings] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);

  // Get list of buildings that need processing
  const loadPendingBuildings = async () => {
    try {
      // This would normally come from a script or API
      // For now, we'll list buildings that exist in bygninger but not in processed form
      const mockPending = [
        { id: 'stueetage_kl_9_cbs_porcelanshaven_2', name: 'Stueetage Kl 9 Cbs Porcelanshaven 2', svg: require('../assets/bygninger/stueetage_kl_9_cbs_porcelanshaven_2.svg') },
        // Add other buildings from bygninger here
      ];
      
      // Filter out buildings that already have overlays
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      const filtered = [];
      
      for (const building of mockPending) {
        const overlayPath = `${baseDir}scannedebyggninger/${building.id}/overlay.json`;
        try {
          await readAsStringAsync(overlayPath);
          // Has overlay, skip
        } catch {
          // No overlay, needs processing
          filtered.push(building);
        }
      }
      
      setPendingBuildings(filtered);
    } catch (error) {
      console.error('Error loading pending buildings:', error);
    }
  };

  useEffect(() => {
    loadPendingBuildings();
  }, []);

  const processBuilding = (building) => {
    setProcessing(building);
  };

  const onProcessingComplete = () => {
    setProcessing(null);
    setProcessedCount(prev => prev + 1);
    loadPendingBuildings(); // Refresh list
    Alert.alert('Success', `Building processed successfully! You can now access it from the main building list.`);
  };

  const onProcessingError = (error) => {
    setProcessing(null);
    Alert.alert('Error', `Failed to process building: ${error.message}`);
  };

  const renderPendingItem = ({ item }) => (
    <TouchableOpacity
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        marginVertical: 6,
        width: 280,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
      }}
      onPress={() => processBuilding(item)}
    >
      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
      <Text style={{ fontSize: 12, color: '#856404', marginTop: 4 }}>
        Tap to process (one-time scan)
      </Text>
    </TouchableOpacity>
  );

  if (processing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        <View style={{ padding: 16, backgroundColor: '#007bff', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            Processing: {processing.name}
          </Text>
          <Text style={{ color: 'white', fontSize: 14, marginTop: 4 }}>
            This will take a moment...
          </Text>
        </View>
        <MapViewer
          svgAssetModule={processing.svg}
          width={350}
          height={600}
          highlightRoom=""
          onMatchChange={() => {}}
          matchIndex={0}
          debugLabels={false}
          debugWalls={true}
          onProcessingComplete={onProcessingComplete}
          onProcessingError={onProcessingError}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 22 }]}>Process Buildings</Text>
      <Text style={{ textAlign: 'center', margin: 16, color: '#666' }}>
        Buildings in this list need one-time processing before they appear in the main app.
      </Text>
      
      {processedCount > 0 && (
        <View style={{ 
          backgroundColor: '#d4edda', 
          padding: 12, 
          margin: 16, 
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: '#28a745'
        }}>
          <Text style={{ color: '#155724', textAlign: 'center' }}>
            ✅ {processedCount} building(s) processed this session
          </Text>
        </View>
      )}

      {pendingBuildings.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#28a745', textAlign: 'center' }}>
            🎉 All buildings processed!
          </Text>
          <Text style={{ color: '#666', marginTop: 8, textAlign: 'center' }}>
            You can access them from the main building list.
          </Text>
          <TouchableOpacity
            style={{ 
              marginTop: 20, 
              paddingHorizontal: 20, 
              paddingVertical: 12, 
              backgroundColor: '#007bff', 
              borderRadius: 8 
            }}
            onPress={() => navigation.navigate('SelectBuilding')}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Go to Building List</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pendingBuildings}
          keyExtractor={(item) => item.id}
          renderItem={renderPendingItem}
          contentContainerStyle={{ alignItems: 'center', paddingVertical: 8 }}
        />
      )}
    </View>
  );
};

export default ProcessBuildingsScreen;