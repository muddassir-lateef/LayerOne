# Quick Setup Guide for DDS Map Images

## Your Situation
- ✅ You have DDS files named like: `rm_cliffbound.dds`, `rm_golden_stream.dds`
- ✅ Files are in a folder
- ❌ DDS format is NOT web-compatible (needs conversion)

---

## ⚡ FASTEST METHOD (5 minutes)

### Step 1: Convert DDS to JPG

**Use XnConvert (Batch Converter - FREE):**

1. **Download**: https://www.xnview.com/en/xnconvert/
2. **Install** and open XnConvert
3. **Input tab**: Click "Add files" → Select ALL your DDS files
4. **Output tab**:
   - Format: **JPG - JPEG/JFIF**
   - Quality: **85**
   - Destination folder: **Same as source** (or choose `map-images` folder)
   - Filename: `{Filename without extension}.jpg`
5. **Click "Convert"** → Done! ✅

**Result**: You now have JPG files like `rm_cliffbound.jpg`, `rm_golden_stream.jpg`

---

### Step 2: Upload to Supabase

1. **Go to Supabase Dashboard** → **Storage** (left sidebar)
2. **Create Bucket**:
   - Name: `map-images`
   - Public: ✅ **YES**
   - Click "Create"
3. **Upload Files**:
   - Click on `map-images` bucket
   - Click "Upload file"
   - Select ALL your JPG files
   - Upload! ✅

---

### Step 3: Generate SQL

**Option A - Use PowerShell Script (EASIEST):**

```powershell
# In PowerShell terminal:
cd D:\Projects\LayerOne
.\scripts\setup-maps.ps1
```

Follow the prompts:
- It will guide you through conversion
- It will generate SQL automatically
- Copy SQL and paste into Supabase SQL Editor
- Execute! ✅

**Option B - Manual SQL Generation:**

1. After uploading to Supabase, click any image
2. Copy the URL pattern: `https://xxxxx.supabase.co/storage/v1/object/public/map-images/`
3. Use the template below

---

## 📝 Manual SQL Template

```sql
-- Replace YOUR_PROJECT with your Supabase project URL
INSERT INTO public.maps (name, description, image_url, display_order) VALUES
  (
    'Cliffbound', 
    'Elevated terrain with strategic cliff positions.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/rm_cliffbound.jpg', 
    1
  ),
  (
    'Golden Stream', 
    'River-based map with gold deposits.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/rm_golden_stream.jpg', 
    2
  );
  -- Add more maps following the same pattern...
```

**Pattern for your maps:**
- `rm_cliffbound.dds` → Name: "Cliffbound", File: `rm_cliffbound.jpg`
- `rm_golden_stream.dds` → Name: "Golden Stream", File: `rm_golden_stream.jpg`

---

## 🎯 Complete Checklist

- [ ] **Convert DDS to JPG** (XnConvert)
- [ ] **Create `map-images` bucket** in Supabase Storage (public)
- [ ] **Upload JPG files** to bucket
- [ ] **Run PowerShell script** OR manually create SQL
- [ ] **Execute SQL** in Supabase SQL Editor
- [ ] **Verify**: `SELECT * FROM maps;`
- [ ] **Done!** Maps ready for use in tournament creation

---

## 🔧 Tools You Need

| Tool | Purpose | Link |
|------|---------|------|
| **XnConvert** | DDS → JPG batch conversion | https://www.xnview.com/en/xnconvert/ |
| **setup-maps.ps1** | Auto-generate SQL | `.\scripts\setup-maps.ps1` |
| **Supabase Dashboard** | Upload images, run SQL | Your project dashboard |

---

## 🆘 Troubleshooting

**Q: XnConvert can't read my DDS files?**
- Try online converter: https://convertio.co/dds-jpg/
- Or use GIMP (free): https://www.gimp.org/

**Q: Images not showing in app?**
- Check bucket is **PUBLIC** ✅
- Test URL directly in browser
- Check image URLs in SQL match Storage URLs

**Q: Script not working?**
- Make sure you're in PowerShell (not CMD)
- Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
- Try again

---

## ⏱️ Time Estimate

- Convert DDS files: **2 minutes**
- Upload to Supabase: **1 minute**
- Run script/generate SQL: **1 minute**
- Execute SQL: **30 seconds**

**Total: ~5 minutes** for complete setup! 🚀

---

## Example for Your Files

Based on your screenshots:

```
rm_cliffbound.dds      → Cliffbound      (Elevated terrain map)
rm_golden_stream.dds   → Golden Stream   (River-based map)
```

After conversion and upload, you'll have:
- `rm_cliffbound.jpg` in Supabase Storage
- `rm_golden_stream.jpg` in Supabase Storage
- SQL INSERT statements ready to execute
- Beautiful map selection UI with images! ✅
