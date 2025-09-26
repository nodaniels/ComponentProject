#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate building list from PDF files in assets/bygninger folder
 * This script creates a simple list of available PDF building plans
 */

const generate = () => {
  console.log('🏗️  Generating building list from PDF files...');
  
  // Path to bygninger folder
  const bygningerPath = path.join(__dirname, '..', 'assets', 'bygninger');
  
  if (!fs.existsSync(bygningerPath)) {
    console.error('❌ bygninger folder not found:', bygningerPath);
    return;
  }

    // Read all PDF files from bygninger
  const files = fs.readdirSync(bygningerPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`📄 Found ${files.length} PDF files in bygninger/`);

  // Create building list
  const buildings = files.map(file => {
    const ext = path.extname(file).toLowerCase();
    const buildingId = path.basename(file, ext);
    console.log(`  - ${buildingId} (${file})`);
    
    return {
      id: buildingId,
      name: buildingId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      pdfFile: file,
      type: ext === '.pdf' ? 'pdf' : 'text'
    };
  });

  // Generate the buildings file
  const outputPath = path.join(__dirname, '..', 'assets', 'buildings.js');
  const content = `// Auto-generated building list from PDF files in bygninger/
// Generated on: ${new Date().toISOString()}

const buildings = ${JSON.stringify(buildings, null, 2)};

export default buildings;
`;

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`✅ Generated ${outputPath} with ${buildings.length} buildings`);

  // Also log building status
  if (buildings.length === 0) {
    console.log('ℹ️  No files found. Add PDF or TXT files to assets/bygninger/ folder.');
  } else {
    console.log('\n📊 Building Status:');
    console.log(`   Available: ${buildings.length} files`);
    console.log('   Ready for text scanning');
  }
};

// Run if called directly
if (require.main === module) {
  generate();
}

module.exports = { generate };
