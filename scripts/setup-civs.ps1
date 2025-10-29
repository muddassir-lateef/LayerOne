# AoE2 Civilization Images Setup - PowerShell Script
# Upload civilization emblems and generate SQL

Write-Host "AoE2 Civilization Setup Helper`n" -ForegroundColor Cyan

# Configuration
$civsFolder = "$PSScriptRoot\..\civ-images"
$outputSQL = "$PSScriptRoot\..\database\generated_civs_insert.sql"

# Default description
$defaultDescription = "To be decided"

# Check if folder exists
if (-not (Test-Path $civsFolder)) {
    Write-Host "Civilizations folder not found: $civsFolder" -ForegroundColor Red
    Write-Host "`nCreating civ-images folder..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $civsFolder | Out-Null
    Write-Host "Created! Please add your civilization images to: $civsFolder" -ForegroundColor Green
    Write-Host "`nImage naming: Use lowercase names like 'aztecs.png', 'britons.png', etc." -ForegroundColor Cyan
    exit
}

# Find all image files
$imageFiles = @()
$imageFiles += @(Get-ChildItem -Path $civsFolder -Filter "*.jpg")
$imageFiles += @(Get-ChildItem -Path $civsFolder -Filter "*.jpeg")
$imageFiles += @(Get-ChildItem -Path $civsFolder -Filter "*.png")

if ($imageFiles.Count -eq 0) {
    Write-Host "No image files found in $civsFolder" -ForegroundColor Red
    Write-Host "`nPlease add civilization emblem images:" -ForegroundColor Yellow
    Write-Host "  - PNG or JPG format" -ForegroundColor Cyan
    Write-Host "  - Name them like: aztecs.png, britons.png, mongols.png" -ForegroundColor Cyan
    Write-Host "  - Square images work best (e.g., 256x256px)" -ForegroundColor Cyan
    exit
}

Write-Host "Found $($imageFiles.Count) civilization images`n" -ForegroundColor Green

# Generate SQL
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Generate SQL for Civilizations" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "IMPORTANT: You need to upload images to Supabase Storage first!`n" -ForegroundColor Yellow

Write-Host "Upload Instructions:" -ForegroundColor Cyan
Write-Host "   1. Go to: Supabase Dashboard -> Storage"
Write-Host "   2. Create bucket: 'civ-images' (make it PUBLIC)"
Write-Host "   3. Upload all civilization images from: $civsFolder"
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

Write-Host "`nGenerating SQL for civilizations:`n" -ForegroundColor Cyan

foreach ($file in $imageFiles) {
    # Extract clean name (remove extension)
    $baseName = $file.BaseName
    
    # Format display name (capitalize first letter of each word, replace underscores)
    # e.g., "armenians" -> "Armenians", "burgundians" -> "Burgundians"
    $displayName = $baseName.Substring(0,1).ToUpper() + $baseName.Substring(1)
    
    # Use default description
    $description = $defaultDescription
    
    # Build image URL
    $imageUrl = "$supabaseUrl/storage/v1/object/public/civ-images/$($file.Name)"
    
    # Create SQL value
    $sqlValue = "  ('$displayName', '$description', '$imageUrl', $displayOrder)"
    $sqlValues += $sqlValue
    
    Write-Host "   + $displayName" -ForegroundColor Green
    $displayOrder++
}

# Build complete SQL
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$civCount = $sqlValues.Count
$valuesJoined = $sqlValues -join ",`n"

$sql = "-- Generated SQL for AoE2 Civilizations`n"
$sql += "-- Generated on: $timestamp`n"
$sql += "-- Total civilizations: $civCount`n`n"
$sql += "INSERT INTO public.civilizations (name, description, image_url, display_order) VALUES`n"
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

Write-Host "Processed: $($sqlValues.Count) civilizations" -ForegroundColor Cyan
Write-Host "SQL saved to: $outputSQL`n" -ForegroundColor Cyan

Write-Host "FINAL STEPS:" -ForegroundColor Yellow
Write-Host "   1. Make sure images are uploaded to Supabase Storage (bucket: civ-images)"
Write-Host "   2. Go to Supabase -> SQL Editor"
Write-Host "   3. Copy contents from: $outputSQL"
Write-Host "   4. Paste and execute in Supabase"
Write-Host "   5. Verify with: SELECT * FROM civilizations ORDER BY display_order;`n"

Write-Host "Your civilizations are ready!`n" -ForegroundColor Green

# Offer to open the SQL file
$openFile = Read-Host "Open generated SQL file now? (y/n)"
if ($openFile -eq 'y') {
    Start-Process $outputSQL
}
