/**
 * Automated Map Setup Script
 * 
 * This script:
 * 1. Converts DDS images to JPG format
 * 2. Uploads them to Supabase Storage
 * 3. Generates SQL INSERT statements
 * 
 * Requirements:
 * - npm install sharp @supabase/supabase-js
 * - Place your map DDS files in ./map-images folder
 * - Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // You'll need to add this
const MAPS_FOLDER = path.join(__dirname, '../map-images');
const BUCKET_NAME = 'map-images';

// Default description for all maps
const DEFAULT_DESCRIPTION = 'To be decided';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Convert DDS to JPG
 */
async function convertDDStoJPG(inputPath, outputPath) {
  try {
    // Note: sharp doesn't support DDS directly
    // We'll use a workaround or you can manually convert first
    console.log(`⚠️  DDS format detected: ${path.basename(inputPath)}`);
    console.log('   Sharp library cannot read DDS files directly.');
    console.log('   Please convert DDS to PNG/JPG first using a tool like:');
    console.log('   - GIMP (free)');
    console.log('   - XnConvert (free, batch conversion)');
    console.log('   - Online: https://convertio.co/dds-jpg/');
    return null;
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error.message);
    return null;
  }
}

/**
 * Process image: resize and optimize
 */
async function processImage(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  
  if (ext === '.dds') {
    return await convertDDStoJPG(inputPath, outputPath);
  }
  
  // For JPG/PNG files, just optimize
  await sharp(inputPath)
    .resize(1280, 720, { 
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
  
  return outputPath;
}

/**
 * Extract clean map name from filename
 */
function getMapName(filename) {
  // Remove extension
  let name = path.parse(filename).name;
  
  // Remove 'rm_' prefix
  name = name.replace(/^rm_/i, '');
  
  // Replace underscores with spaces
  name = name.replace(/_/g, ' ');
  
  // Capitalize each word
  name = name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return name;
}

/**
 * Get description for map
 */
function getMapDescription(filename) {
  return DEFAULT_DESCRIPTION;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImage(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath);
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
  
  if (error) {
    console.error(`❌ Error uploading ${filename}:`, error.message);
    return null;
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filename);
  
  console.log(`✅ Uploaded: ${filename}`);
  return publicUrl;
}

/**
 * Generate SQL INSERT statement
 */
function generateSQL(maps) {
  let sql = '-- Generated SQL for map pool\n';
  sql += 'INSERT INTO public.maps (name, description, image_url, display_order) VALUES\n';
  
  const values = maps.map((map, index) => {
    return `  ('${map.name}', '${map.description}', '${map.imageUrl}', ${index + 1})`;
  });
  
  sql += values.join(',\n');
  sql += ';\n';
  
  return sql;
}

/**
 * Main setup function
 */
async function setupMaps() {
  console.log('🎮 AoE2 Map Setup Script\n');
  
  // Check if maps folder exists
  if (!fs.existsSync(MAPS_FOLDER)) {
    console.error(`❌ Maps folder not found: ${MAPS_FOLDER}`);
    console.log('   Please create a "map-images" folder and add your DDS files there.');
    process.exit(1);
  }
  
  // Check Supabase credentials
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.log('   Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
    console.log('   Get your service key from: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
  }
  
  // Read all files from maps folder
  const files = fs.readdirSync(MAPS_FOLDER)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.dds', '.jpg', '.jpeg', '.png'].includes(ext);
    });
  
  if (files.length === 0) {
    console.error('❌ No image files found in map-images folder');
    process.exit(1);
  }
  
  console.log(`📁 Found ${files.length} map images\n`);
  
  // Check for DDS files
  const ddsFiles = files.filter(f => path.extname(f).toLowerCase() === '.dds');
  if (ddsFiles.length > 0) {
    console.log('⚠️  WARNING: DDS files detected!');
    console.log('   DDS format is not web-compatible and cannot be converted automatically.');
    console.log('   \n   🔧 SOLUTION: Convert DDS to JPG first:');
    console.log('   1. Download XnConvert (free): https://www.xnview.com/en/xnconvert/');
    console.log('   2. Add all DDS files');
    console.log('   3. Output format: JPG, Quality: 85%');
    console.log('   4. Output folder: same as input (overwrite)');
    console.log('   5. Click "Convert"');
    console.log('   \n   Then run this script again!\n');
    process.exit(1);
  }
  
  // Process each image
  const processedMaps = [];
  const tempDir = path.join(__dirname, '../temp-processed');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(MAPS_FOLDER, file);
    const outputFilename = file.replace(/^rm_/i, '').replace(/\.[^.]+$/, '.jpg');
    const outputPath = path.join(tempDir, outputFilename);
    
    console.log(`\n[${i + 1}/${files.length}] Processing: ${file}`);
    
    // Process image (resize & optimize)
    try {
      await processImage(inputPath, outputPath);
      console.log(`   ✓ Optimized`);
    } catch (error) {
      console.error(`   ❌ Failed to process: ${error.message}`);
      continue;
    }
    
    // Upload to Supabase
    const imageUrl = await uploadImage(outputPath, outputFilename);
    if (!imageUrl) continue;
    
    // Store map info
    processedMaps.push({
      name: getMapName(file),
      description: getMapDescription(file),
      imageUrl: imageUrl
    });
  }
  
  // Generate SQL
  if (processedMaps.length > 0) {
    const sql = generateSQL(processedMaps);
    const sqlPath = path.join(__dirname, '../database/generated_maps_insert.sql');
    fs.writeFileSync(sqlPath, sql);
    
    console.log('\n\n✅ SETUP COMPLETE!\n');
    console.log(`📊 Processed ${processedMaps.length} maps`);
    console.log(`📝 SQL file created: ${sqlPath}`);
    console.log('\n🔥 Next Steps:');
    console.log('   1. Go to Supabase SQL Editor');
    console.log('   2. Copy and paste the SQL from generated_maps_insert.sql');
    console.log('   3. Execute the query');
    console.log('   4. Your maps are ready! 🎮\n');
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true });
  } else {
    console.error('\n❌ No maps were processed successfully');
  }
}

// Run the script
setupMaps().catch(console.error);
