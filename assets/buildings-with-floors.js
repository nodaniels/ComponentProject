// Buildings with multiple floors support
// Each building can have multiple floors (different PDF files)

const buildingsWithFloors = [
  {
    id: "cbs_porcelanshaven_21",
    name: "CBS Porcelænshaven 21",
    floors: [
      {
        id: "stueetage",
        name: "S", // Stueetage
        fullName: "Stue etage",
        pdfFile: "porcelaenshaven/stueetage_kl_9_cbs_porcelanshaven_21.pdf",
        pdfModule: require('./bygninger/porcelaenshaven/stueetage_kl_9_cbs_porcelanshaven_21.pdf')
      },
      {
        id: "1sal", 
        name: "1",
        fullName: "1. sal",
        pdfFile: "porcelaenshaven/porcelaenshaven_1._sal_pdf_1 (1).pdf",
        pdfModule: require('./bygninger/porcelaenshaven/porcelaenshaven_1._sal_pdf_1 (1).pdf')
      },
      {
        id: "2sal", 
        name: "2",
        fullName: "2. sal",
        pdfFile: "porcelaenshaven/121128-02_2_sal_kl_9_cbs_porcelaenshaven.pdf",
        pdfModule: require('./bygninger/porcelaenshaven/121128-02_2_sal_kl_9_cbs_porcelaenshaven.pdf')
      }
    ]
  },
  {
    id: "cbs_kilen_1", 
    name: "CBS Kilen 1",
    floors: [
      {
        id: "stueetage",
        name: "S",
        fullName: "Stue etage", 
        pdfFile: "stueetage_cbs_kilen_1.pdf",
        pdfModule: require('./bygninger/stueetage_cbs_kilen_1.pdf')
      }
    ]
  }
];

export default buildingsWithFloors;