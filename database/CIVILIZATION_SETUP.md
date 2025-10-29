# Civilization Images Setup Guide

## Overview

Upload all Age of Empires II civilization emblems/flags to Supabase for use in the drafting system. These are **global** - all civs are available for all tournaments (no per-tournament selection needed).

---

## Quick Setup Steps

### 1. Prepare Civilization Images

**Image Requirements:**
- **Format**: PNG (transparent background recommended) or JPG
- **Size**: Square images work best (256x256px, 512x512px, or 1024x1024px)
- **Naming**: Lowercase civ names: `aztecs.png`, `britons.png`, `mongols.png`, etc.

**Where to Get Images:**
- AoE2 Wiki: https://ageofempires.fandom.com/wiki/Civilizations_(Age_of_Empires_II)
- Steam Community
- Game files (extract from game)
- Or create your own emblems

**Place images in:**
```
D:\Projects\LayerOne\civ-images\
```

---

### 2. Upload to Supabase Storage

1. **Supabase Dashboard** → **Storage**
2. **Create Bucket**:
   - Name: `civ-images`
   - Public: ✅ **YES**
3. **Upload All Images** to the bucket

---

### 3. Run PowerShell Script

```powershell
cd D:\Projects\LayerOne
.\scripts\setup-civs.ps1
```

The script will:
- Detect all civilization images in `civ-images/` folder
- Auto-generate civilization names from filenames
- Create SQL INSERT statements with correct image URLs
- Save to `database/generated_civs_insert.sql`

---

### 4. Execute SQL in Supabase

1. Go to **Supabase** → **SQL Editor**
2. Run `database/civilizations_schema.sql` first (creates the table)
3. Then run the generated SQL from `database/generated_civs_insert.sql`
4. Verify: `SELECT * FROM civilizations ORDER BY display_order;`

---

## Example Civilization List (AoE2 DE)

Here are all 42 civilizations you'll need images for:

**Base Game + Expansions:**
1. Aztecs
2. Bengalis
3. Berbers
4. Bohemians
5. Britons
6. Bulgarians
7. Burgundians
8. Burmese
9. Byzantines
10. Celts
11. Chinese
12. Cumans
13. Dravidians
14. Ethiopians
15. Franks
16. Goths
17. Gurjaras
18. Hindustanis
19. Huns
20. Incas
21. Italians
22. Japanese
23. Khmer
24. Koreans
25. Lithuanians
26. Magyars
27. Malay
28. Malians
29. Mayans
30. Mongols
31. Persians
32. Poles
33. Portuguese
34. Saracens
35. Sicilians
36. Slavs
37. Spanish
38. Tatars
39. Teutons
40. Turks
41. Vietnamese
42. Vikings

*(Note: More civs may be added in future DLCs)*

---

## File Naming Convention

```
aztecs.png         → Aztecs
britons.png        → Britons
byzantines.png     → Byzantines
mongols.png        → Mongols
hindustanis.png    → Hindustanis (formerly Indians)
```

The script automatically capitalizes the first letter for display.

---

## Folder Structure

```
D:\Projects\LayerOne\
├── civ-images\              ← Put your civilization images here
│   ├── aztecs.png
│   ├── britons.png
│   ├── mongols.png
│   └── ...
├── scripts\
│   └── setup-civs.ps1       ← Run this script
└── database\
    ├── civilizations_schema.sql
    └── generated_civs_insert.sql (created by script)
```

---

## What Happens After Upload?

Once civilizations are in the database:
- ✅ All civs are available globally
- ✅ Used in team drafting phase (future feature)
- ✅ No per-tournament selection needed
- ✅ Players will see civ emblems during draft
- ✅ Can be updated/disabled individually if needed

---

## Tips

- **Transparent PNGs** look best for emblems
- **Square images** work better than rectangular
- **Consistent size** (e.g., all 512x512px) for uniform display
- You can update individual civs later by re-running the script with updated images

---

## Next Steps After Setup

After civilizations are uploaded, they'll be ready for:
1. ✅ Team formation (players select teams)
2. ✅ Civilization drafting UI (pick/ban phase)
3. ✅ Match details (show which civ each player used)

No need to select civs during tournament creation - they're always available!
