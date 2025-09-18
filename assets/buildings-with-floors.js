// Buildings with multiple floors support
// Each building can have multiple floors (different image files)

const buildingsWithFloors = [
  {
    id: "cbs_porcelanshaven_21",
    name: "CBS Porcelænshaven 21",
    floors: [
      {
        id: "stueetage",
        name: "S", // Stueetage
        fullName: "Stue etage",
        imageFile: "porcelaenshaven/stue.png",
        imageModule: null // Will be loaded dynamically to handle missing files
      },
      {
        id: "1sal", 
        name: "1",
        fullName: "1. sal",
        imageFile: "porcelaenshaven/1_sal.png",
        imageModule: null // Will be loaded dynamically to handle missing files
      },
      {
        id: "2sal", 
        name: "2",
        fullName: "2. sal",
        imageFile: "porcelaenshaven/2_sal.png",
        imageModule: null // Will be loaded dynamically to handle missing files
      }
    ]
  },
  // Kilen removed: only using stue.png, 1_sal.png, 2_sal.png as requested
];

export default buildingsWithFloors;