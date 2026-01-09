# Script de prueba para crear un pedido

$body = @{
    productId = 1
    quantity = 2
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/orders" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Pedido creado exitosamente:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error al crear pedido:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "Detalles:" $_.ErrorDetails.Message
}
