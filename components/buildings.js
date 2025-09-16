// Static list of available building SVGs - FALLBACK ONLY
// Note: This file is only used as a fallback when buildings.generated.js is not available
// New buildings should be managed through the generate-buildings.js workflow
export const BUILDINGS = [
  {
    id: 'building',
    name: 'Building',
    // This building has been moved to scannedebyggninger and is generated dynamically
    svg: require('../assets/scannedebyggninger/building/floorplan.svg'),
  },
  // Note: Other buildings should be in bygninger folder and processed through the workflow
  // The system will only show buildings that have been fully processed in scannedebyggninger
];

export default BUILDINGS;
