# Run this from the snaptogether folder in PowerShell
# cd "C:\Users\Purva\OneDrive\Desktop\Personal Projects\snaptogether"

Write-Host "Installing framer-motion..." -ForegroundColor Magenta
Set-Location frontend
npm install framer-motion react-dropzone

Write-Host "Done! Restart npm run dev" -ForegroundColor Green
