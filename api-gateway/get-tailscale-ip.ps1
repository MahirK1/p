# Jednostavna skripta za dobijanje Tailscale IP adrese
# Koristi: .\get-tailscale-ip.ps1

Write-Host "Provera Tailscale IP adrese..." -ForegroundColor Cyan
Write-Host ""

$tailscaleIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "100.*"} | Select-Object -First 1 -ExpandProperty IPAddress

if ($tailscaleIP) {
    Write-Host "Tailscale IP adresa: $tailscaleIP" -ForegroundColor Green
    Write-Host ""
    Write-Host "Koristi ovu IP adresu u .env fajlu na cloud serveru:" -ForegroundColor Yellow
    Write-Host "ERP_API_GATEWAY_URL=http://$tailscaleIP:3001" -ForegroundColor White
} else {
    Write-Host "Tailscale IP nije pronadjen!" -ForegroundColor Red
    Write-Host "Proveri da li je Tailscale pokrenut i povezan." -ForegroundColor Yellow
}

Write-Host ""

