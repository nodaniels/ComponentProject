# Building Processing Workflow

Dette system sikrer at bygninger kun scannes én gang og derefter er tilgængelige uden yderligere scanning.

## Mappestruktur

```
assets/
├── bygninger/                          # ← Nye .svg filer placeres her
│   ├── porcelaenshaven_1._sal_pdf_1.svg
│   └── stueetage_kl_9_cbs_porcelanshaven_2.svg
└── scannedebyggninger/                  # ← Processerede bygninger (bruger interface)
    └── building/
        ├── floorplan.svg
        └── overlay.json                 # ← Gemt scanning data
```

## Workflow

### 1. Tilføj nye bygninger
Placer nye .svg filer i `assets/bygninger/`:
```bash
cp ny-plantegning.svg assets/bygninger/
```

### 2. Se status
```bash
npm run gen:buildings
```
Dette viser:
- Hvor mange bygninger der venter på processering
- Hvor mange der er færdige til brug

### 3. Processer bygninger
Der er to måder:

**Option A: Via appen (anbefalet)**
1. Start appen: `npm start`
2. Byg bygning fra `bygninger` - scanning sker automatisk
3. Efter scanning er bygningen klar til brug

**Option B: Manuel flytning**
```bash
# Flyt bygning manuelt (hvis du allerede har processing data)
npm run move:building building-id
```

### 4. Resultat
- Bygninger i `scannedebyggninger` er tilgængelige i appen
- Ingen rescanning sker nogensinde
- Hurtig loading og søgning

## Kommandoer

```bash
# Se bygningsstatus
npm run gen:buildings

# Flyt processeret bygning
npm run move:building <building-id>

# Se tilgængelige bygninger til flytning
npm run move:building

# Start app (inkluderer automatisk gen:buildings)
npm start
```

## Vigtige noter

- **Kun bygninger i `scannedebyggninger` vises i appen**
- **Bygninger i `bygninger` skal processeres først**
- **Efter processering flytter bygningerne automatisk**
- **Ingen rescanning sker nogensinde**

## Debugging

Hvis en bygning ikke vises:
1. Check om den er i `bygninger` (skal processeres)
2. Check om `overlay.json` eksisterer i `scannedebyggninger/{building-id}/`
3. Kør `npm run gen:buildings` for at se status