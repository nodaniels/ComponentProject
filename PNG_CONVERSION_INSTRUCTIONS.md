# PNG Konvertering Instruktioner

Du skal konvertere følgende PDF filer til PNG format og placere dem i de rigtige mapper:

## Filer der skal konverteres:

1. **Porcelænshaven Stue etage:**
   - Fra: `assets/bygninger/porcelaenshaven/stueetage_kl_9_cbs_porcelanshaven_21.pdf`
   - Til: `assets/bygninger/porcelaenshaven/stue.png`

2. **Porcelænshaven 1. sal:**
   - Fra: `assets/bygninger/porcelaenshaven/porcelaenshaven_1._sal_pdf_1 (1).pdf`
   - Til: `assets/bygninger/porcelaenshaven/1_sal.png`

3. **Porcelænshaven 2. sal:**
   - Fra: `assets/bygninger/porcelaenshaven/121128-02_2_sal_kl_9_cbs_porcelaenshaven.pdf`
   - Til: `assets/bygninger/porcelaenshaven/2_sal.png`

4. **Kilen Stue etage:**
   - Fra: `assets/bygninger/stueetage_cbs_kilen_1.pdf`
   - Til: `assets/bygninger/porcelaenshaven/kilen_stue.png`

**Note:** Alle PNG filer skal placeres i `assets/bygninger/porcelaenshaven/` mappen.

## Konvertering metoder:

### Option 1: Online konvertering
- Brug en online PDF til PNG konverter som https://www.ilovepdf.com/pdf_to_jpg
- Upload PDF filen
- Vælg høj kvalitet (300 DPI eller højere)
- Download PNG filen og omdøb den til det rigtige navn

### Option 2: macOS Preview
1. Åbn PDF filen i Preview
2. Gå til File > Export...
3. Vælg "PNG" som format
4. Vælg høj resolution
5. Gem med det rigtige filnavn

### Option 3: Command line (ImageMagick)
```bash
# Install imagemagick hvis ikke allerede installeret
brew install imagemagick

# Konverter PDF til PNG
convert -density 300 input.pdf output.png
```

## Anbefalet kvalitet:
- **Resolution:** 300 DPI eller højere
- **Format:** PNG (for bedre kvalitet end JPG)
- **Farver:** RGB color space

## Efter konvertering:
1. Placér PNG filerne i de rigtige mapper som angivet ovenfor
2. Kør `npm start` for at teste appen
3. Søgefunktionen burde nu virke meget hurtigere!

## OCR (tekst-scanning) krav og fejlfinding
- For at scanne tekst fra PNG-billeder bruger appen `react-native-mlkit-ocr`. Dette kræver en native build.
- Hvis du kører i Expo Go, vil OCR være deaktiveret. Byg en udviklingsklient eller EAS build for at aktivere det.

### Installer og byg (kun én gang pr. platform)
1. Installer afhængighed:
   - `npm install react-native-mlkit-ocr`
2. For udviklingsklient (anbefalet):
   - iOS: `npx expo run:ios` (eller EAS: `eas build -p ios --profile development`)
   - Android: `npx expo run:android` (eller EAS: `eas build -p android --profile development`)

### Typiske fejl
- "OCR disabled": betyder at appen kører i et miljø uden text recognition (f.eks. Expo Go). Løs ved at bygge en dev klient.
- "Failed to load or scan image": check debug boksen i appen for flere detaljer (sti, tid, antal detektioner).

## Justering af lokaler:
Hvis lokal-markeringerne ikke er præcise nok, kan du justere koordinaterne i `ImageViewer.js` filen under `loadRoomData` funktionen.