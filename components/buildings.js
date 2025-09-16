// Static list of available building SVGs; add more as you drop files into assets/bygninger
export const BUILDINGS = [
  {
    id: 'demo-building',
    name: 'Demo bygning',
    // Default simple two-rooms demo SVG
    svg: require('../assets/bygninger/building.svg'),
  },
  {
    id: 'porcelanshaven-stue',
    name: 'Porcelænshaven – Stueetage',
    svg: require('../assets/bygninger/stueetage_kl_9_cbs_porcelanshaven_2.svg'),
  },
];

export default BUILDINGS;
