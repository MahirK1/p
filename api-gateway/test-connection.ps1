# PowerShell skripta za testiranje konekcije na lokalnom računaru
# Koristi: .\test-connection.ps1

Write-Host "🔍 Testiranje API Gateway konekcije..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Provera da li server radi lokalno
Write-Host "1️⃣  Testiranje lokalnog servera..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Server radi lokalno!" -ForegroundColor Green
        Write-Host "   📄 Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Server ne radi lokalno!" -ForegroundColor Red
    Write-Host "   💡 Pokreni server: pm2 start ecosystem.config.cjs" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Provera Tailscale IP
Write-Host "2️⃣  Provera Tailscale IP adrese..." -ForegroundColor Yellow
$tailscaleIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "100.*"} | Select-Object -First 1 -ExpandProperty IPAddress

if ($tailscaleIP) {
    Write-Host "   ✅ Tailscale IP pronađen: $tailscaleIP" -ForegroundColor Green
} else {
    Write-Host "   ❌ Tailscale IP nije pronađen!" -ForegroundColor Red
    Write-Host "   💡 Proveri da li je Tailscale pokrenut i povezan" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 3: Provera PM2 statusa
Write-Host "3️⃣  Provera PM2 statusa..." -ForegroundColor Yellow
$pm2Status = pm2 status 2>&1
if ($pm2Status -match "erp-api-gateway.*online") {
    Write-Host "   ✅ PM2 proces radi!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  PM2 proces možda ne radi" -ForegroundColor Yellow
    Write-Host "   💡 Pokreni: pm2 start ecosystem.config.cjs" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Provera Firewall-a
Write-Host "4️⃣  Provera Windows Firewall-a..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "API Gateway" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "   ✅ Firewall pravilo postoji!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Firewall pravilo ne postoji" -ForegroundColor Yellow
    Write-Host "   💡 Kreiraj pravilo:" -ForegroundColor Yellow
    Write-Host "      New-NetFirewallRule -DisplayName 'API Gateway' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow" -ForegroundColor Gray
}
Write-Host ""

Write-Host "✅ Testiranje završeno!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Tvoja Tailscale IP adresa: $tailscaleIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sledeći korak:" -ForegroundColor Yellow
Write-Host "   Na cloud serveru, testiraj konekciju:" -ForegroundColor White
Write-Host "   curl http://$tailscaleIP:3001/health" -ForegroundColor Gray
Write-Host ""

