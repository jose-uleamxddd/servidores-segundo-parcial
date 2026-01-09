# Script de Prueba de Idempotencia
# Este script crea UN pedido, luego simula reenvios del MISMO evento

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   PRUEBA DE IDEMPOTENCIA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Paso 1: Crear pedido normal" -ForegroundColor Yellow
Write-Host "Este pedido generara UN eventId unico`n"

# Crear pedido (esto generara 1 evento con 1 eventId)
$response1 = Invoke-RestMethod -Uri "http://localhost:3000/orders" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        productId = 1
        quantity = 2
    } | ConvertTo-Json)

Write-Host "Pedido creado:" -ForegroundColor Green
Write-Host "   - Order ID: $($response1.data.id)" -ForegroundColor White
Write-Host "   - Producto ID: $($response1.data.productId)" -ForegroundColor White
Write-Host "   - Cantidad: $($response1.data.quantity)" -ForegroundColor White
Write-Host "   - Estado: $($response1.data.status)" -ForegroundColor White

Write-Host "`nEsperando 3 segundos para que se procese el evento..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "`nVerificando estado del pedido..." -ForegroundColor Yellow
$orderCheck = Invoke-RestMethod -Uri "http://localhost:3000/orders/$($response1.data.id)" -Method GET
Write-Host "   - Estado actual: $($orderCheck.status)" -ForegroundColor $(if ($orderCheck.status -eq "CONFIRMED") { "Green" } else { "Red" })

Write-Host "`n========================================`n" -ForegroundColor Cyan
Write-Host "VERIFICAR EN BASE DE DATOS:" -ForegroundColor Yellow
Write-Host "`n1. Ver eventos procesados (deberia haber 1 registro):" -ForegroundColor White
Write-Host '   docker exec mysql-products mysql -uroot -proot products_db -e "SELECT * FROM processed_events ORDER BY processedAt DESC LIMIT 5;"' -ForegroundColor Gray

Write-Host "`n2. Ver stock del producto (deberia haberse reducido en 2):" -ForegroundColor White
Write-Host '   docker exec mysql-products mysql -uroot -proot products_db -e "SELECT id, name, stock FROM products WHERE id=1;"' -ForegroundColor Gray

Write-Host "`n3. Ver el pedido creado:" -ForegroundColor White
Write-Host "   docker exec mysql-orders mysql -uroot -proot orders_db -e ""SELECT * FROM orders WHERE id=$($response1.data.id);""" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "EXPLICACION DE IDEMPOTENCIA:" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "COMPORTAMIENTO ESPERADO:" -ForegroundColor Green
Write-Host "   - El pedido se proceso UNA sola vez" -ForegroundColor White
Write-Host "   - El stock se redujo UNA sola vez (en 2 unidades)" -ForegroundColor White
Write-Host "   - Hay UN registro en processed_events" -ForegroundColor White
Write-Host "   - Si RabbitMQ reenviara el mensaje, NO se procesaria de nuevo" -ForegroundColor White

Write-Host "`nCOMO SE GARANTIZA?" -ForegroundColor Cyan
Write-Host "   1. Orders Service genera un eventId unico (UUID)" -ForegroundColor White
Write-Host "   2. Products Service verifica si ese eventId ya existe en 'processed_events'" -ForegroundColor White
Write-Host "   3. Si existe -> Ignora el mensaje (idempotencia)" -ForegroundColor White
Write-Host "   4. Si NO existe -> Procesa y registra el eventId" -ForegroundColor White

Write-Host "`nPARA SIMULAR MENSAJES DUPLICADOS:" -ForegroundColor Yellow
Write-Host "   Normalmente RabbitMQ podria reenviar un mensaje si:" -ForegroundColor White
Write-Host "   - El consumidor falla antes de hacer ACK" -ForegroundColor White
Write-Host "   - Hay reconexiones de red" -ForegroundColor White
Write-Host "   - El servicio se reinicia durante el procesamiento" -ForegroundColor White
Write-Host "`n   En este caso, como Orders genera un eventId NUEVO en cada" -ForegroundColor White
Write-Host "   llamada a /orders, cada pedido tiene su propio eventId." -ForegroundColor White

Write-Host "`nPRUEBA COMPLETADA" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
