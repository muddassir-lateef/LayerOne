# AoE2 Map Setup - PowerShell Script
# This script helps you convert DDS files and prepare SQL for Supabase

Write-Host "AoE2 Map Setup Helper`n" -ForegroundColor Cyan

# Configuration
$mapsFolder = "$PSScriptRoot\..\map-images"
$outputSQL = "$PSScriptRoot\..\database\generated_maps_insert.sql"

# Default description for all maps
$defaultDescription = "To be decided"

# Check if maps folder exists
if (-not (Test-Path $mapsFolder)) {
    Write-Host "Maps folder not found: $mapsFolder" -ForegroundColor Red
    Write-Host "`nCreating map-images folder..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $mapsFolder | Out-Null
    Write-Host "Created! Please add your .dds files to: $mapsFolder" -ForegroundColor Green
    exit
}

# Find all image files
$ddsFiles = @(Get-ChildItem -Path $mapsFolder -Filter "*.dds")
$jpgFiles = @(Get-ChildItem -Path $mapsFolder -Filter "*.jpg")
$jpegFiles = @(Get-ChildItem -Path $mapsFolder -Filter "*.jpeg")
$pngFiles = @(Get-ChildItem -Path $mapsFolder -Filter "*.png")

$allImageFiles = @($jpgFiles) + @($jpegFiles) + @($pngFiles)

if ($allImageFiles.Count -gt 0) {
    Write-Host "Found $($allImageFiles.Count) already converted image files (JPG/PNG)" -ForegroundColor Green
    Write-Host "Skipping conversion step...`n" -ForegroundColor Cyan
    $skipConversion = $true
} elseif ($ddsFiles.Count -gt 0) {
    Write-Host "Found $($ddsFiles.Count) DDS files`n" -ForegroundColor Green
    $skipConversion = $false
} else {
    Write-Host "No .dds or image files found in $mapsFolder" -ForegroundColor Red
    Write-Host "Please add your map image files to this folder." -ForegroundColor Yellow
    exit
}# Step 1: DDS Conversion Instructions (only if needed)
if (-not $skipConversion) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "STEP 1: Convert DDS to JPG/PNG" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Host "DDS files need to be converted to JPG/PNG format for web use.`n"

    Write-Host "Quick Conversion Options:`n" -ForegroundColor Cyan

    Write-Host "Option A - XnConvert (Recommended, Free):" -ForegroundColor Green
    Write-Host "   1. Download: https://www.xnview.com/en/xnconvert/"
    Write-Host "   2. Install and open XnConvert"
    Write-Host "   3. Click 'Add files' and select all your DDS files"
    Write-Host "   4. Go to 'Output' tab"
    Write-Host "   5. Format: JPG (Quality: 85) or PNG (for transparency)"
    Write-Host "   6. Destination folder: Same as source"
    Write-Host "   7. Click 'Convert'"
    Write-Host ""

    Write-Host "Option B - Online Converter (Quick):" -ForegroundColor Green
    Write-Host "   1. Go to: https://convertio.co/dds-jpg/"
    Write-Host "   2. Upload your DDS files (up to 10 at once)"
    Write-Host "   3. Convert and download as JPG/PNG"
    Write-Host "   4. Save files back to: $mapsFolder"
    Write-Host ""

    Write-Host "Option C - GIMP (Free, Manual):" -ForegroundColor Green
    Write-Host "   1. Download: https://www.gimp.org/"
    Write-Host "   2. Open each DDS file"
    Write-Host "   3. Export as JPG/PNG (Quality: 85)"
    Write-Host ""

    # List the files that need conversion
    Write-Host "`nFiles to convert:" -ForegroundColor Yellow
    foreach ($file in $ddsFiles) {
        $cleanName = $file.Name -replace '^rm_', '' -replace '\.dds$', ''
        Write-Host "   * $($file.Name) -> $cleanName.jpg or $cleanName.png"
    }

    Write-Host "`n========================================`n" -ForegroundColor Cyan

    # Ask if user has converted files
    $response = Read-Host "Have you converted the DDS files to JPG/PNG? (y/n)"

    if ($response -ne 'y') {
        Write-Host "`nNo problem! Convert the files first, then run this script again." -ForegroundColor Yellow
        Write-Host "Script location: $PSScriptRoot\setup-maps.ps1`n" -ForegroundColor Cyan
        exit
    }
}

# Get all image files for processing
$imageFiles = @()
$imageFiles += @(Get-ChildItem -Path $mapsFolder -Filter "*.jpg")
$imageFiles += @(Get-ChildItem -Path $mapsFolder -Filter "*.jpeg")
$imageFiles += @(Get-ChildItem -Path $mapsFolder -Filter "*.png")

if ($imageFiles.Count -eq 0) {
    Write-Host "No JPG/PNG files found. Please convert DDS files first." -ForegroundColor Red
    exit
}

Write-Host "Found $($imageFiles.Count) image file(s) to process`n" -ForegroundColor Green

# Step 2: Generate map data and SQL
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Generate SQL" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "IMPORTANT: You need to upload JPG files to Supabase Storage first!`n" -ForegroundColor Yellow

Write-Host "Upload Instructions:" -ForegroundColor Cyan
Write-Host "   1. Go to: Supabase Dashboard -> Storage"
Write-Host "   2. Create bucket: 'map-images' (make it PUBLIC)"
Write-Host "   3. Upload all JPG/PNG files from: $mapsFolder"
Write-Host "   4. Copy your Supabase project URL`n"

$supabaseUrl = Read-Host "Enter your Supabase project URL (e.g., https://xxxxx.supabase.co)"

if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    Write-Host "`nSupabase URL required. Exiting." -ForegroundColor Red
    exit
}

# Remove trailing slash
$supabaseUrl = $supabaseUrl.TrimEnd('/')

# Generate SQL
$sqlValues = @()
$displayOrder = 1

Write-Host "`nGenerating SQL for maps:`n" -ForegroundColor Cyan

foreach ($file in $imageFiles) {
    # Extract clean name (remove rm_ prefix and extension)
    $baseName = $file.BaseName -replace '^rm_', ''
    
    # Format display name (capitalize words, replace underscores)
    $displayName = ($baseName -replace '_', ' ').Split(' ') | ForEach-Object {
        $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower()
    }
    $displayName = $displayName -join ' '
    
    # Use default description
    $description = $defaultDescription
    
    # Build image URL
    $imageUrl = "$supabaseUrl/storage/v1/object/public/map-images/$($file.Name)"
    
    # Create SQL value
    $sqlValue = "  ('$displayName', '$description', '$imageUrl', $displayOrder)"
    $sqlValues += $sqlValue
    
    Write-Host "   + $displayName" -ForegroundColor Green
    $displayOrder++
}

# Build complete SQL
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$mapCount = $sqlValues.Count
$valuesJoined = $sqlValues -join ",`n"

$sql = "-- Generated SQL for AoE2 Map Pool`n"
$sql += "-- Generated on: $timestamp`n"
$sql += "-- Total maps: $mapCount`n`n"
$sql += "INSERT INTO public.maps (name, description, image_url, display_order) VALUES`n"
$sql += $valuesJoined
$sql += "`nON CONFLICT (name) DO UPDATE SET`n"
$sql += "  description = EXCLUDED.description,`n"
$sql += "  image_url = EXCLUDED.image_url,`n"
$sql += "  display_order = EXCLUDED.display_order,`n"
$sql += "  updated_at = NOW();`n"

# Save SQL file
$sql | Out-File -FilePath $outputSQL -Encoding UTF8

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUCCESS!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Processed: $($sqlValues.Count) maps" -ForegroundColor Cyan
Write-Host "SQL saved to: $outputSQL`n" -ForegroundColor Cyan

Write-Host "FINAL STEPS:" -ForegroundColor Yellow
Write-Host "   1. Make sure JPG/PNG files are uploaded to Supabase Storage (bucket: map-images)"
Write-Host "   2. Go to Supabase -> SQL Editor"
Write-Host "   3. Copy contents from: $outputSQL"
Write-Host "   4. Paste and execute in Supabase"
Write-Host "   5. Verify with: SELECT * FROM maps ORDER BY display_order;`n"

Write-Host "Your map pool is ready to use!`n" -ForegroundColor Green

# Offer to open the SQL file
$openFile = Read-Host "Open generated SQL file now? (y/n)"
if ($openFile -eq 'y') {
    Start-Process $outputSQL
}
