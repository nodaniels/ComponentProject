import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Image } from 'react-native';
import { Asset } from 'expo-asset';
import Svg, { Circle } from 'react-native-svg';
import { ensureLocalFileUri, recognizeImageText } from '../utils/ocr';

const ImageViewer = ({ buildingId, fileName, imageAssetModule, searchText, onMatchChange, currentMatchIndex = 0, entranceCoordinates = null }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [allRooms, setAllRooms] = useState([]); // OCR-detected text items
  const [allEntrances, setAllEntrances] = useState([]); // Detected/derived entrances (optional)
  const [error, setError] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 400, height: 300 });
  const [debugInfo, setDebugInfo] = useState([]); // Collect debug lines for visibility

  const DEBUG = true;

  // Heuristic: determine if a text looks like a room label (e.g., "1.12", "K.03", "3.17")
  const isRoomLabel = (txt) => {
    if (!txt) return false;
    const t = String(txt).trim();
    // Accept forms like K.01, 1.12, 2.07, A.15, PH.12 (short prefixes), allow dash variants too
    const patterns = [
      /^(?:[A-Za-z]{1,2}\.)?\d{1,3}(?:[\.\-]\d{1,3})?$/,
    ];
    return patterns.some((re) => re.test(t));
  };

  const screenWidth = Dimensions.get('window').width;
  const viewerWidth = screenWidth - 32;
  const viewerHeight = Math.round(viewerWidth * (imageDimensions.height / imageDimensions.width));

  // Filter rooms based on search and find nearest entrance
  const getSearchResults = () => {
    if (!searchText || !searchText.trim()) {
      return { rooms: [], nearestEntrance: null, allMatches: [], currentIndex: 0, totalMatches: 0 };
    }

    const searchTerm = searchText.toLowerCase().trim();
    
    // Get all matching rooms
    const allMatches = allRooms.filter(room => 
      room.id.toLowerCase().includes(searchTerm) || 
      room.text.toLowerCase().includes(searchTerm)
    );
    
    if (allMatches.length === 0) {
      return { rooms: [], nearestEntrance: null, allMatches: [], currentIndex: 0, totalMatches: 0 };
    }
    
    // Ensure currentMatchIndex is within bounds
    const validIndex = Math.max(0, Math.min(currentMatchIndex || 0, allMatches.length - 1));
    
    // Get the current room to display based on currentMatchIndex
    const currentRoom = allMatches[validIndex];
    const roomsToShow = currentRoom ? [currentRoom] : [];

    // Find nearest entrance to the current room
    let nearestEntrance = null;
    if (currentRoom && allEntrances.length > 0) {
      let minDistance = Infinity;
      
      allEntrances.forEach(entrance => {
        const distance = Math.sqrt(
          Math.pow(entrance.x - currentRoom.x, 2) + 
          Math.pow(entrance.y - currentRoom.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestEntrance = entrance;
        }
      });
    }

    return { 
      rooms: roomsToShow, 
      nearestEntrance, 
      allMatches,
      currentIndex: validIndex,
      totalMatches: allMatches.length
    };
  };

  const { rooms: displayRooms, nearestEntrance, allMatches, currentIndex, totalMatches } = getSearchResults();

  // Update parent when search changes
  useEffect(() => {
    if (onMatchChange && allRooms.length > 0) {
      const searchResults = getSearchResults();
      onMatchChange(searchResults.allMatches, searchResults.currentIndex);
    }
  }, [searchText, currentMatchIndex, allRooms.length, allEntrances.length]);
  
  // Build human-readable debug lines
  const pushDebug = (line) => {
    if (!DEBUG) return;
    setDebugInfo(prev => [...prev, line]);
    console.log(`[ImageViewer DEBUG] ${line}`);
  };

  // Load image when component mounts or props change
  useEffect(() => {
    const loadImage = async () => {
      if (!fileName) {
        setError('No image file provided');
        return;
      }

  setDebugInfo([]);
  pushDebug(`Starting to load image: ${fileName}`);

      // Try to dynamically require the image if no module provided
      let assetModule = imageAssetModule;
      if (!assetModule) {
        try {
          if (fileName.includes('porcelaenshaven/stue.png')) {
            assetModule = require('../assets/bygninger/porcelaenshaven/stue.png');
          } else if (fileName.includes('porcelaenshaven/1_sal.png')) {
            assetModule = require('../assets/bygninger/porcelaenshaven/1_sal.png');
          } else if (fileName.includes('porcelaenshaven/2_sal.png')) {
            assetModule = require('../assets/bygninger/porcelaenshaven/2_sal.png');
          } else {
            setError(`Image file ${fileName} not found. Please convert your PDF files to PNG format and place them in the correct folders. See PNG_CONVERSION_INSTRUCTIONS.md for details.`);
            return;
          }
        } catch (e) {
          console.error('Failed to require image:', e);
          setError(`Could not load image: ${fileName}. Please make sure the PNG file exists. See PNG_CONVERSION_INSTRUCTIONS.md for conversion instructions.`);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      
      try {
        pushDebug(`Loading asset for: ${fileName}`);
        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        
        pushDebug(`Image asset loaded: ${uri}`);
        setImageUri(uri);
        
        // Get image dimensions and then run OCR
        await new Promise((resolve, reject) => {
          Image.getSize(
            uri,
            async (width, height) => {
              try {
                setImageDimensions({ width, height });
                pushDebug(`Image dimensions: ${width}x${height}`);

                // Run OCR on the image to detect text and positions
                const localPath = await ensureLocalFileUri(uri);
                pushDebug(`Ensured local file path for OCR: ${localPath}`);

                const t0 = Date.now();
                const ocrResult = await recognizeImageText(localPath);
                const t1 = Date.now();
                pushDebug(`OCR finished in ${(t1 - t0)}ms`);

                if (ocrResult?.disabled) {
                  pushDebug('OCR disabled (likely running in Expo Go or dependency not built).');
                  if (Array.isArray(ocrResult.debug)) {
                    ocrResult.debug.forEach(d => pushDebug(d));
                  }
                }
                if (ocrResult?.error) {
                  pushDebug(`OCR error: ${ocrResult.error}`);
                }
                if (ocrResult?.stats) {
                  pushDebug(`OCR stats — blocks: ${ocrResult.stats.blockCount}, lines: ${ocrResult.stats.lineCount}, elements: ${ocrResult.stats.elementCount}`);
                }

                // Map OCR results to room markers (center points), normalize to screen coords
                const localViewerHeight = Math.round(viewerWidth * (height / width));
                const screenRoomsRaw = (ocrResult?.items || []).map((it, idx) => {
                  const centerX = it.bounds.left + it.bounds.width / 2;
                  const centerY = it.bounds.top + it.bounds.height / 2;
                  const normX = centerX / width;
                  const normY = centerY / height;
                  return {
                    id: it.text,
                    text: it.text,
                    name: it.text,
                    x: normX * viewerWidth,
                    y: normY * localViewerHeight,
                    rawBounds: it.bounds,
                    idx
                  };
                });

                const screenRooms = screenRoomsRaw.filter((r) => isRoomLabel(r.text));

                pushDebug(`OCR detected ${screenRoomsRaw.length} texts, ${screenRooms.length} look like rooms`);
                if (screenRoomsRaw.length > 0) {
                  const sample = screenRoomsRaw.slice(0, 5).map(s => s.text).join(', ');
                  pushDebug(`Sample texts: ${sample}`);
                }

                setAllRooms(screenRooms);
                // Provide a default entrance so SearchScreen's entrance hint still works on stueetage
                const defaultEntrance = {
                  text: 'Hovedindgang',
                  x: 0.5 * viewerWidth,
                  y: 0.9 * localViewerHeight,
                };
                setAllEntrances([defaultEntrance]);
                pushDebug('Default entrance added at center-bottom');
                resolve();
              } catch (dimErr) {
                reject(dimErr);
              }
            },
            (err) => reject(err)
          );
        });
        
      } catch (err) {
        console.error('Image loading/OCR error:', err);
        setError(`Failed to load or scan image: ${err.message}. See debug for details.`);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [fileName, imageAssetModule]);

  // Update parent callback when search changes
  useEffect(() => {
    if (onMatchChange && allRooms.length > 0) {
      const searchResults = getSearchResults();
      onMatchChange(searchResults.allMatches, searchResults.currentIndex);
    }
  }, [searchText, allRooms.length]);

  return (
    <ScrollView style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Indlæser bygningsplan...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {DEBUG && debugInfo.length > 0 && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug</Text>
          {debugInfo.map((line, i) => (
            <Text key={i} style={styles.debugLine}>• {line}</Text>
          ))}
        </View>
      )}

      {/* Only show search results when actively searching */}
      {searchText && totalMatches > 0 && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchStats}>
            Viser: {displayRooms[0]?.id || displayRooms[0]?.text || 'N/A'} ({currentIndex + 1} af {totalMatches})
            {nearestEntrance && ' • Nærmeste indgang vist'}
          </Text>
        </View>
      )}

      {imageUri && (
        <View style={styles.imageContainer}>
          <View style={[styles.imageWrapper, { width: viewerWidth, height: viewerHeight }]}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
            
            {/* Overlay markers - only show when searching */}
            <Svg 
              style={StyleSheet.absoluteFill}
              width={viewerWidth} 
              height={viewerHeight}
            >
              {/* Show matching rooms when searching */}
              {searchText && displayRooms.map((room, index) => (
                <Circle
                  key={`room-${index}`}
                  cx={room.x}
                  cy={room.y}
                  r={10}
                  fill="#4CAF50"
                  stroke="#2E7D32"
                  strokeWidth={2}
                  opacity={0.9}
                />
              ))}
              
              {/* Show nearest entrance when searching and found, or use provided entrance coordinates */}
              {searchText && (nearestEntrance || entranceCoordinates) && (
                <Circle
                  cx={entranceCoordinates ? entranceCoordinates.x : nearestEntrance.x}
                  cy={entranceCoordinates ? entranceCoordinates.y : nearestEntrance.y}
                  r={8}
                  fill="#FF9800"
                  stroke="#F57C00"
                  strokeWidth={2}
                  opacity={0.9}
                />
              )}
            </Svg>
          </View>
        </View>
      )}

      {searchText && (
        <View style={styles.searchResults}>
          <Text style={styles.searchTitle}>
            Søgeresultater for "{searchText}": {totalMatches} matches
          </Text>
          {allMatches.map((room, index) => (
            <Text key={index} style={styles.searchResult}>
              • {room.id} - {room.name}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  loadingText: {
    color: '#1976d2',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  debugContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff8e1',
    borderRadius: 8,
  },
  debugTitle: {
    fontWeight: 'bold',
    color: '#8d6e63',
    marginBottom: 6,
  },
  debugLine: {
    color: '#6d4c41',
    fontSize: 12,
    marginBottom: 2,
  },
  searchInfo: {
    margin: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  searchStats: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  imageContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  searchResults: {
    margin: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  searchResult: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
});

export default ImageViewer;