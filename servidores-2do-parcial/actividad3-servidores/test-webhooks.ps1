# Script de prueba para flujo completo con webhooks
Write-Host "Iniciando prueba de flujo con Webhooks" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Crear un pedido
Write-Host "Paso 1: Creando pedido..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:3000/orders" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"productId": 1, "quantity": 2}'

Write-Host "Pedido creado:" -ForegroundColor Green
Write-Host "   - Order ID: $($response.data.id)" -ForegroundColor White
Write-Host "   - Product ID: $($response.data.productId)" -ForegroundColor White
Write-Host "   - Quantity: $($response.data.quantity)" -ForegroundColor White
Write-Host "   - Status: $($response.data.status)" -ForegroundColor White
Write-Host ""

$orderId = $response.data.id

# Paso 2: Esperar procesamiento
Write-Host "Paso 2: Esperando procesamiento (5 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Paso 3: Consultar estado final del pedido
Write-Host "Paso 3: Consultando estado del pedido..." -ForegroundColor Yellow
$orderStatus = Invoke-RestMethod -Uri "http://localhost:3000/orders/$orderId" -Method GET

Write-Host "Estado final del pedido:" -ForegroundColor Green
Write-Host "   - Order ID: $($orderStatus.id)" -ForegroundColor White
Write-Host "   - Status: $($orderStatus.status)" -ForegroundColor White
if ($orderStatus.status -eq "confirmed") {
    Write-Host "   Pedido confirmado exitosamente!" -ForegroundColor Green
} else {
    Write-Host "   Pedido no confirmado: $($orderStatus.reason)" -ForegroundColor Red
}
Write-Host ""

# Paso 4: Verificar stock del producto
Write-Host "Paso 4: Verificando stock del producto..." -ForegroundColor Yellow
$dockerCmd = "docker exec mysql-products mysql -uroot -proot products_db -e `"SELECT id, name, stock FROM products WHERE id=1;`""
$stockResult = Invoke-Expression $dockerCmd

Write-Host "Stock actualizado:" -ForegroundColor Green
Write-Host $stockResult -ForegroundColor White
Write-Host ""

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Prueba completada" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora verifica los webhooks en Supabase:" -ForegroundColor Cyan
Write-Host "   1. Ve a: https://supabase.com/dashboard/project/aidmhgugrycsgzzarsou/editor" -ForegroundColor White
Write-Host "   2. Consulta la tabla webhook_events para ver eventos registrados" -ForegroundColor White
Write-Host "   3. Consulta processed_webhooks para verificar idempotencia" -ForegroundColor White
Write-Host ""
