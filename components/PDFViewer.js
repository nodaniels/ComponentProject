import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Circle } from 'react-native-svg';

const PDFViewer = ({ buildingId, fileName, fileType, pdfAssetModule, searchText, onMatchChange, currentMatchIndex = 0 }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [allRooms, setAllRooms] = useState([]); // Store all rooms but don't show by default
  const [allEntrances, setAllEntrances] = useState([]); // Store all entrances
  const [error, setError] = useState(null);
  const [pdfHtml, setPdfHtml] = useState(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 400, height: 300 });

  const screenWidth = Dimensions.get('window').width;
  const viewerWidth = screenWidth - 32;
  const viewerHeight = Math.round(viewerWidth * (pdfDimensions.height / pdfDimensions.width));

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

  // Create HTML with PDF.js
  const createPdfHtml = (base64Data) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; overflow: hidden; }
    #viewer { position: relative; width: 100vw; height: 100vh; }
    #canvas { width: 100%; height: auto; display: block; }
    #textLayer { position: absolute; top: 0; left: 0; pointer-events: none; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <div id="viewer">
    <canvas id="canvas"></canvas>
    <div id="textLayer"></div>
  </div>

  <script>
    async function loadPDF() {
      try {
        // Set up PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // Convert base64 to Uint8Array
        const base64 = '${base64Data}';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        // Load PDF
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const page = await pdf.getPage(1);
        
        // Set up canvas
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Send dimensions to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'dimensions',
          width: viewport.width,
          height: viewport.height
        }));
        
        // Render PDF page
        await page.render({ canvasContext: context, viewport }).promise;
        
        // Get text content
        const textContent = await page.getTextContent();
        const textLayer = document.getElementById('textLayer');
        textLayer.style.width = viewport.width + 'px';
        textLayer.style.height = viewport.height + 'px';
        textLayer.style.display = 'none'; // Hide text layer completely
        
        // Render text layer (invisible, only for coordinate extraction)
        await pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayer,
          viewport: viewport,
          textDivs: []
        }).promise;
        
        // Wait a bit for text layer to fully render
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Extract room and entrance data from both raw text items AND rendered spans
        const foundRooms = [];
        const foundEntrances = [];
        
        // Method 1: Extract from raw text content items with their positions
        textContent.items.forEach(item => {
          const text = item.str.trim();
          if (!text || text.length < 2) return; // Skip very short text
          
          // Transform coordinates from PDF space to canvas space
          const transform = item.transform;
          const x = transform[4]; // x position
          const y = transform[5]; // y position
          
          // Convert to viewport coordinates
          const canvasX = x * viewport.scale;
          const canvasY = viewport.height - (y * viewport.scale); // PDF y is bottom-up, canvas is top-down
          
          // Normalize coordinates (0-1 range)
          const normalizedX = canvasX / viewport.width;
          const normalizedY = canvasY / viewport.height;
          
          // Ensure coordinates are within bounds
          const boundedX = Math.max(0, Math.min(1, normalizedX));
          const boundedY = Math.max(0, Math.min(1, normalizedY));
          
          // Check if this text contains "indgang" - if so, it's an entrance
          if (/indgang/i.test(text)) {
            foundEntrances.push({
              text: text,
              x: boundedX,
              y: boundedY,
              method: 'rawTextContent'
            });
          } else {
            // Everything else is a room
            foundRooms.push({
              id: text, // Use the actual text as the room ID
              text: text,
              x: boundedX,
              y: boundedY,
              method: 'rawTextContent'
            });
          }
        });
        
        // Method 2: Also check rendered spans as backup
        const spans = textLayer.querySelectorAll('span');
        spans.forEach(span => {
          const text = span.textContent.trim();
          if (!text || text.length < 2) return; // Skip very short text
          
          const rect = span.getBoundingClientRect();
          const containerRect = document.getElementById('viewer').getBoundingClientRect();
          
          const x = (rect.left - containerRect.left + rect.width / 2);
          const y = (rect.top - containerRect.top + rect.height / 2);
          
          const normalizedX = x / viewport.width;
          const normalizedY = y / viewport.height;
          
          // Ensure coordinates are within bounds
          const boundedX = Math.max(0, Math.min(1, normalizedX));
          const boundedY = Math.max(0, Math.min(1, normalizedY));
          
          // Check if this text contains "indgang" - if so, it's an entrance
          if (/indgang/i.test(text)) {
            // Only add if not already found by raw text method
            if (!foundEntrances.some(e => e.text === text && Math.abs(e.x - boundedX) < 0.01)) {
              foundEntrances.push({
                text: text,
                x: boundedX,
                y: boundedY,
                method: 'renderedSpan'
              });
            }
          } else {
            // Everything else is a room - only add if not already found
            if (!foundRooms.some(r => r.text === text && Math.abs(r.x - boundedX) < 0.01)) {
              foundRooms.push({
                id: text, // Use the actual text as the room ID
                text: text,
                x: boundedX,
                y: boundedY,
                method: 'renderedSpan'
              });
            }
          }
        });
        
        // Remove duplicate rooms based on text and approximate position
        const uniqueRooms = [];
        foundRooms.forEach(room => {
          const isDuplicate = uniqueRooms.some(existing => 
            existing.text === room.text && 
            Math.abs(existing.x - room.x) < 0.02 && 
            Math.abs(existing.y - room.y) < 0.02
          );
          if (!isDuplicate) {
            uniqueRooms.push(room);
          }
        });
        
        // Remove duplicate entrances based on text and approximate position
        const uniqueEntrances = [];
        foundEntrances.forEach(entrance => {
          const isDuplicate = uniqueEntrances.some(existing => 
            existing.text === entrance.text && 
            Math.abs(existing.x - entrance.x) < 0.02 && 
            Math.abs(existing.y - entrance.y) < 0.02
          );
          if (!isDuplicate) {
            uniqueEntrances.push(entrance);
          }
        });
        
        // Send extracted data to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'extracted',
          rooms: uniqueRooms,
          entrances: uniqueEntrances
        }));
        
      } catch (error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    }
    
    // Start loading when page is ready
    window.addEventListener('load', loadPDF);
  </script>
</body>
</html>`;
  };

  // Load PDF when component mounts or props change
  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfAssetModule || !fileName) {
        setError('No PDF file provided');
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const asset = Asset.fromModule(pdfAssetModule);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const html = createPdfHtml(base64);
        setPdfHtml(html);
        
      } catch (err) {
        setError(`Failed to load PDF: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [fileName, pdfAssetModule]);

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'dimensions':
          setPdfDimensions({ width: data.width, height: data.height });
          break;
          
        case 'extracted':
          // Convert normalized coordinates to screen coordinates and store all items
          const screenRooms = data.rooms.map(room => ({
            ...room,
            x: room.x * viewerWidth,
            y: room.y * viewerHeight,
            name: `Room ${room.id}`
          }));
          
          const screenEntrances = data.entrances.map(entrance => ({
            ...entrance,
            x: entrance.x * viewerWidth,
            y: entrance.y * viewerHeight
          }));
          
          // Store all rooms and entrances but don't display by default
          setAllRooms(screenRooms);
          setAllEntrances(screenEntrances);
          
          // Call parent callback with current search results
          if (onMatchChange) {
            const searchResults = getSearchResults();
            onMatchChange(searchResults.allMatches, searchResults.currentIndex);
          }
          break;
          
        case 'error':
          console.error('PDF.js error:', data.message);
          setError(`PDF processing error: ${data.message}`);
          break;
      }
    } catch (err) {
      console.warn('Failed to parse WebView message:', err);
    }
  };

  // Filter rooms for search highlighting
  const filteredRooms = searchText 
    ? allRooms.filter(room => room.id.toLowerCase().includes(searchText.toLowerCase()))
    : [];

  // Update parent callback when search changes
  useEffect(() => {
    if (onMatchChange && allRooms.length > 0) {
      const searchResults = getSearchResults();
      onMatchChange(searchResults.allMatches, searchResults.currentIndex);
    }
  }, [searchText, allRooms.length]);

  return (
    <ScrollView style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
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

      {pdfHtml && (
        <View style={styles.pdfContainer}>
          <View style={[styles.pdfWrapper, { width: viewerWidth, height: viewerHeight }]}>
            <WebView
              source={{ html: pdfHtml }}
              style={styles.webview}
              javaScriptEnabled={true}
              onMessage={handleWebViewMessage}
              originWhitelist={['*']}
              mixedContentMode="always"
              onError={(error) => setError(`WebView error: ${error.nativeEvent.description}`)}
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
              
              {/* Show nearest entrance when searching and found */}
              {searchText && nearestEntrance && (
                <Circle
                  cx={nearestEntrance.x}
                  cy={nearestEntrance.y}
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
            Search results for "{searchText}": {filteredRooms.length} matches
          </Text>
          {filteredRooms.map((room, index) => (
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  spinner: {
    marginLeft: 10,
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
  pdfContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  pdfWrapper: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'white',
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

export default PDFViewer;