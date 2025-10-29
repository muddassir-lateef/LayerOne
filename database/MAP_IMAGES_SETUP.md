# Map Images Setup Guide

## Overview

Store AoE2 map images in Supabase Storage for efficient delivery and management.

---

## Step 1: Create Storage Bucket (One-time setup)

### In Supabase Dashboard:

1. Go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Settings:
   - **Name**: `map-images`
   - **Public bucket**: ✅ **YES** (images need to be publicly accessible)
   - **File size limit**: 5 MB (plenty for map images)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`
4. Click **"Create bucket"**

---

## Step 2: Prepare Map Images

### Image Requirements:
- **Format**: JPG, PNG, or WebP
- **Size**: 800x600px or 1280x720px (16:9 aspect ratio works well)
- **File size**: < 500KB (optimize for web)
- **Naming**: `mapname.jpg` (lowercase, no spaces)

### Recommended Maps (Popular AoE2 Competitive Maps):

1. **arabia.jpg** - Arabia
2. **arena.jpg** - Arena
3. **nomad.jpg** - Nomad
4. **blackforest.jpg** - Black Forest
5. **islands.jpg** - Islands
6. **hideout.jpg** - Hideout
7. **runestones.jpg** - Runestones
8. **goldenpit.jpg** - Golden Pit
9. **socotra.jpg** - Socotra

### Where to Get Images:

**Option 1: Screenshots from AoE2**
- Take in-game screenshots
- Crop to show map overview
- Resize to 800x600px

**Option 2: Download from Community**
- AoE2 Wiki
- Steam Workshop screenshots
- Community websites

**Option 3: Placeholder (for testing)**
- Use https://placehold.co/800x600/667eea/white?text=Arabia
- Replace with real images later

---

## Step 3: Upload Images to Supabase

### Method 1: Manual Upload (Quick & Easy)

1. In Supabase Dashboard → **Storage** → **map-images**
2. Click **"Upload file"**
3. Select all your map images
4. Upload them
5. Each image gets a public URL like:
   ```
   https://[your-project].supabase.co/storage/v1/object/public/map-images/arabia.jpg
   ```

### Method 2: Bulk Upload via Script (Advanced)

Create `upload-maps.js` in your project root:

```javascript
// This is a one-time script to upload map images
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY' // Use service role for upload
);

async function uploadMapImages() {
  const imagesDir = './map-images'; // Folder with your images
  const files = fs.readdirSync(imagesDir);
  
  for (const file of files) {
    if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) continue;
    
    const filePath = path.join(imagesDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from('map-images')
      .upload(file, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      console.error(`Error uploading ${file}:`, error);
    } else {
      console.log(`✓ Uploaded ${file}`);
    }
  }
}

uploadMapImages();
```

---

## Step 4: Insert Map Data

### Get Public URLs

After uploading, get the public URL for each image:

```
https://[your-project-ref].supabase.co/storage/v1/object/public/map-images/arabia.jpg
```

### Insert Maps into Database

Go to Supabase **SQL Editor** and run:

```sql
-- Replace URLs with your actual Supabase Storage URLs
INSERT INTO public.maps (name, description, image_url, display_order) VALUES
  (
    'Arabia', 
    'Open map with few resources. Classic competitive map requiring strong early game.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/arabia.jpg', 
    1
  ),
  (
    'Arena', 
    'Closed map with stone walls. Allows for safer booming and late game strategies.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/arena.jpg', 
    2
  ),
  (
    'Nomad', 
    'Start without a Town Center. Must find a good location quickly.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/nomad.jpg', 
    3
  ),
  (
    'Black Forest', 
    'Dense forests limit early aggression. Favors defensive boom strategies.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/blackforest.jpg', 
    4
  ),
  (
    'Islands', 
    'Naval-focused map. Requires strong water control.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/islands.jpg', 
    5
  ),
  (
    'Hideout', 
    'Unique layout with central area. Encourages map control.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/hideout.jpg', 
    6
  ),
  (
    'Runestones', 
    'Open map with central relics. Combines aggression with relic control.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/runestones.jpg', 
    7
  ),
  (
    'Golden Pit', 
    'Open map with gold in center. Encourages aggressive play.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/goldenpit.jpg', 
    8
  ),
  (
    'Socotra', 
    'Hybrid map with land and water. Requires versatile strategies.', 
    'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/map-images/socotra.jpg', 
    9
  );
```

---

## Step 5: Verify Setup

### Test in SQL Editor:

```sql
-- View all maps
SELECT id, name, description, image_url FROM public.maps ORDER BY display_order;

-- Test image URL (copy and paste in browser)
SELECT image_url FROM public.maps WHERE name = 'Arabia';
```

If the URL opens an image in your browser, you're good to go! ✅

---

## Quick Start with Placeholders

If you want to test without real images first:

```sql
-- Insert maps with placeholder images
INSERT INTO public.maps (name, description, image_url, display_order) VALUES
  ('Arabia', 'Open map with few resources.', 'https://placehold.co/800x600/667eea/white?text=Arabia', 1),
  ('Arena', 'Closed map with stone walls.', 'https://placehold.co/800x600/764ba2/white?text=Arena', 2),
  ('Nomad', 'Start without a Town Center.', 'https://placehold.co/800x600/48bb78/white?text=Nomad', 3),
  ('Black Forest', 'Dense forests limit aggression.', 'https://placehold.co/800x600/ed8936/white?text=Black+Forest', 4),
  ('Islands', 'Naval-focused map.', 'https://placehold.co/800x600/4299e1/white?text=Islands', 5);
```

Replace with real images later!

---

## Storage Bucket Policy (Security)

Your bucket is public (read-only), which is fine for map images. If you want to restrict who can upload:

```sql
-- Only authenticated users can upload
CREATE POLICY "Authenticated users can upload maps"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'map-images');
```

---

## File Structure

```
map-images/           (Supabase Storage bucket)
├── arabia.jpg
├── arena.jpg
├── nomad.jpg
├── blackforest.jpg
├── islands.jpg
├── hideout.jpg
├── runestones.jpg
├── goldenpit.jpg
└── socotra.jpg
```

---

## Cost Considerations

**Supabase Free Tier:**
- 1 GB storage (plenty for ~100 map images)
- 2 GB bandwidth/month
- Images are cached by browsers

**Pro Tip:** Use WebP format for smaller file sizes (50-70% smaller than JPG)

---

## Next Steps

After setup:
1. ✅ Images in Supabase Storage
2. ✅ Maps in database with correct URLs
3. ✅ Ready to build UI for map selection!

See `MAP_SELECTION_FEATURE.md` for UI implementation guide.
