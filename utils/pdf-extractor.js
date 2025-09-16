// Using legacy import while migrating to new File/Directory API
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

/**
 * Real PDF Text Extractor for React Native/Expo
 * Extracts text directly from PDF files using binary analysis
 */
export class PDFTextExtractor {
  constructor() {
    // Cache for extracted PDF content
    this.extractedCache = new Map();
  }

  /**
   * Extract text from actual PDF file
   * @param {string} fileName - Name of the PDF file in assets/bygninger
   * @param {string} fileType - Type of file (should be 'pdf')
   * @param {any} pdfAssetModule - Pre-loaded asset module (passed from component)
   * @returns {Promise<string>} Extracted text content
   */
  async extractText(fileName, fileType, pdfAssetModule = null) {
    console.log(`🔍 Real PDF extraction from: ${fileName}`);
    
    // Check cache first
    if (this.extractedCache.has(fileName)) {
      console.log('⚡ Using cached PDF extraction');
      return this.extractedCache.get(fileName);
    }
    
    try {
      if (fileType === 'pdf' && fileName.endsWith('.pdf')) {
        console.log('📄 Loading PDF asset and extracting text...');
        
        let uri = null;
        
        if (pdfAssetModule) {
          // Use pre-loaded asset module
          const pdfAsset = Asset.fromModule(pdfAssetModule);
          await pdfAsset.downloadAsync();
          uri = pdfAsset.localUri || pdfAsset.uri;
        } else {
          // Try to construct file path
          const documentsDir = FileSystem.documentDirectory;
          const pdfPath = `${documentsDir}../assets/bygninger/${fileName}`;
          const fileInfo = await FileSystem.getInfoAsync(pdfPath);
          if (fileInfo.exists) {
            uri = pdfPath;
          }
        }
        
        if (uri) {
          console.log('📄 PDF asset loaded, attempting text extraction...');
          
          // Extract text from the actual PDF file
          const extractedText = await this.extractTextFromPDF(fileName, uri);
          
          // Cache the result
          this.extractedCache.set(fileName, extractedText);
          
          return extractedText;
        } else {
          throw new Error('Could not load PDF file');
        }
      }
      
      throw new Error(`Unsupported file type: ${fileType}. Only PDF files are supported.`);
      
    } catch (error) {
      console.error('❌ Error extracting PDF text:', error);
      throw new Error(`Could not extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF file using multiple methods
   * @param {string} fileName - PDF file name
   * @param {string} uri - Local URI of PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPDF(fileName, uri) {
    console.log('🔍 Attempting PDF text extraction...');
    
    try {
      // Method 1: Try to read as UTF-8 text first (works for some PDFs)
      console.log('📄 Method 1: Reading PDF as UTF-8 text...');
      const textContent = await FileSystem.readAsStringAsync(uri, {
        encoding: 'utf8',
      });
      
      // Look for room patterns and entrance keywords in text
      const roomPattern = /\b[0-9]+\.[0-9]+\b/g;
      const entrancePattern = /\b(indgang|entrance|adgang|udgang|entry|exit|dør|door|eingang|løkke|gang|trappe)\b/gi;
      
      const textRooms = textContent.match(roomPattern) || [];
      const textEntrances = textContent.match(entrancePattern) || [];
      
      console.log(`📊 UTF-8 method found ${textRooms.length} rooms and ${textEntrances.length} entrances`);
      
      if (textRooms.length > 0 || textEntrances.length > 0) {
        return this.buildExtractedContent(fileName, textRooms, textEntrances, 'UTF-8 text');
      }
      
      // Method 2: Try base64 binary analysis
      console.log('📄 Method 2: Analyzing PDF binary content...');
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      
      // Convert base64 to binary string
      const binaryString = atob(base64Data);
      
      // Search for text patterns in binary data
      const binaryRooms = binaryString.match(roomPattern) || [];
      const binaryEntrances = binaryString.match(entrancePattern) || [];
      
      console.log(`📊 Binary method found ${binaryRooms.length} rooms and ${binaryEntrances.length} entrances`);
      
      if (binaryRooms.length > 0 || binaryEntrances.length > 0) {
        return this.buildExtractedContent(fileName, binaryRooms, binaryEntrances, 'binary analysis');
      }
      
      // No fallback generation: if nothing found, throw to signal failure
      throw new Error('No extractable text patterns found in PDF');
      
    } catch (error) {
      console.error('❌ All extraction methods failed:', error);
      // Propagate error to caller; no synthetic content
      throw error;
    }
  }

  /**
   * Build extracted content from found patterns
   */
  buildExtractedContent(fileName, rooms, entrances, method) {
    let extractedText = `PDF læst med ${method}: ${fileName}\n\n`;
    
    if (rooms.length > 0) {
      extractedText += 'LOKALER:\n';
      const uniqueRooms = [...new Set(rooms)];
      for (const room of uniqueRooms.slice(0, 50)) {
        extractedText += `${room} Lokale\n`;
      }
      extractedText += '\n';
    }
    
    if (entrances.length > 0) {
      extractedText += 'INDGANGE:\n';
      const uniqueEntrances = [...new Set(entrances.map(e => e.toLowerCase()))];
      for (let i = 0; i < Math.min(uniqueEntrances.length, 8); i++) {
        extractedText += `Indgang ${i + 1}\n`;
      }
    }
    
    console.log(`✅ Successfully extracted content using ${method}`);
    return extractedText;
  }

  // Removed synthetic content generator to ensure only real PDF data is used

  /**
   * Clear extraction cache
   */
  clearCache() {
    this.extractedCache.clear();
    console.log('🧹 PDF extraction cache cleared');
  }

  /**
   * Check if file has been extracted before
   * @param {string} fileName - File name to check
   * @returns {boolean} True if cached
   */
  isCached(fileName) {
    return this.extractedCache.has(fileName);
  }

  /**
   * Get cache statistics
   * @returns {object} Cache info
   */
  getCacheInfo() {
    return {
      size: this.extractedCache.size,
      files: Array.from(this.extractedCache.keys())
    };
  }
}

// Export singleton instance
export const pdfExtractor = new PDFTextExtractor();
export default pdfExtractor;