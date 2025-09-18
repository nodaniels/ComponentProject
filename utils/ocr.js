// OCR utilities for recognizing text in PNG images using react-native-mlkit-ocr.
// Works with Expo Bare or EAS builds where native modules are available.
// For Expo Go, we fallback to a no-op with clear error messaging.

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// If using react-native-mlkit-ocr (recommended), import here.
// This requires adding the dependency and building the app (EAS or prebuild).
// We'll lazy-require to avoid crashes if not installed.
let MlkitOcr = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MlkitOcr = require('react-native-mlkit-ocr');
} catch (e) {
  // Module not installed; we'll handle gracefully
  MlkitOcr = null;
}

export async function ensureLocalFileUri(uri) {
  // If it's already a file:// URI, return as-is
  if (uri?.startsWith('file://')) return uri;
  // For asset URIs, download to cache to ensure local file path
  const fileName = uri?.split('/')?.pop() || `image-${Date.now()}.png`;
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  const res = await FileSystem.downloadAsync(uri, dest);
  return res.uri;
}

export async function recognizeImageText(localFileUri) {
  if (!localFileUri) throw new Error('recognizeImageText: missing localFileUri');

  if (!MlkitOcr) {
    const reason = Platform.select({
      ios: 'react-native-mlkit-ocr is not installed/built. Install and rebuild the app to enable OCR.',
      android: 'react-native-mlkit-ocr is not installed/built. Install and rebuild the app to enable OCR.',
      default: 'OCR not supported in this environment.'
    });
    return {
      items: [],
      debug: [`OCR disabled: ${reason}`, `File: ${localFileUri}`],
      disabled: true,
    };
  }

  try {
    // Debug what's actually in MlkitOcr
    console.log('[OCR DEBUG] MlkitOcr object:', MlkitOcr);
    console.log('[OCR DEBUG] MlkitOcr type:', typeof MlkitOcr);
    if (MlkitOcr) {
      console.log('[OCR DEBUG] MlkitOcr keys:', Object.keys(MlkitOcr));
      console.log('[OCR DEBUG] detectFromUri type:', typeof MlkitOcr.detectFromUri);
      if (MlkitOcr.default) {
        console.log('[OCR DEBUG] MlkitOcr.default keys:', Object.keys(MlkitOcr.default));
        console.log('[OCR DEBUG] MlkitOcr.default.detectFromUri type:', typeof MlkitOcr.default.detectFromUri);
      }
    }
    
    // Store the function reference to ensure it doesn't get lost
    const ocrFunction = MlkitOcr?.default?.detectFromUri;
    console.log('[OCR DEBUG] Stored function type:', typeof ocrFunction);
    console.log('[OCR DEBUG] About to call function with URI:', localFileUri);
    
    if (!ocrFunction) {
      throw new Error('OCR function not available');
    }
    
    // Use the stored function reference
    console.log('[OCR DEBUG] Calling OCR function...');
    const result = await ocrFunction(localFileUri);
    console.log('[OCR DEBUG] OCR function returned:', typeof result, result);
    
    // Result is array of blocks, each block has: { text, bounding, lines }
    // We want individual text items with their coordinates
    const items = [];
    let blockCount = 0, lineCount = 0, elementCount = 0;
    
    if (Array.isArray(result)) {
      blockCount = result.length;
      
      result.forEach((block) => {
        if (block?.text && block?.bounding) {
          // Add block-level text
          items.push({
            text: block.text.trim(),
            bounds: {
              left: block.bounding.left || 0,
              top: block.bounding.top || 0,
              width: block.bounding.width || 0,
              height: block.bounding.height || 0,
            },
          });
          
          // Also add line-level text for more granular detection
          if (block.lines && Array.isArray(block.lines)) {
            lineCount += block.lines.length;
            block.lines.forEach((line) => {
              if (line?.text && line?.bounding) {
                items.push({
                  text: line.text.trim(),
                  bounds: {
                    left: line.bounding.left || 0,
                    top: line.bounding.top || 0,
                    width: line.bounding.width || 0,
                    height: line.bounding.height || 0,
                  },
                });
              }
              
              // Add element-level text for finest granularity  
              if (line.elements && Array.isArray(line.elements)) {
                elementCount += line.elements.length;
                line.elements.forEach((element) => {
                  if (element?.text && element?.bounding) {
                    items.push({
                      text: element.text.trim(),
                      bounds: {
                        left: element.bounding.left || 0,
                        top: element.bounding.top || 0,
                        width: element.bounding.width || 0,
                        height: element.bounding.height || 0,
                      },
                    });
                  }
                });
              }
            });
          }
        }
      });
    }
    
    console.log('[OCR DEBUG] Processed OCR result: items =', items.length, 'blocks =', blockCount);
    return { items, disabled: false, stats: { blockCount, lineCount, elementCount } };
  } catch (err) {
    console.log('[OCR DEBUG] OCR function threw error:', err);
    console.log('[OCR DEBUG] Error message:', err?.message);
    console.log('[OCR DEBUG] Error stack:', err?.stack);
    return {
      items: [],
      disabled: false,
      error: err?.message || String(err),
    };
  }
}
