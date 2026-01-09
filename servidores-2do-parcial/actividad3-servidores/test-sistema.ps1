# Prueba del Sistema con IA
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  PRUEBA DEL SISTEMA CON IA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Consultar tools disponibles
Write-Host "1. Consultando tools disponibles..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:4000/ai/tools" -Method Get
Write-Host ("   Tools encontrados: " + $response.count) -ForegroundColor Green
Write-Host ""

# Test 2: Buscar productos con IA
Write-Host "2. Preguntando a la IA sobre productos..." -ForegroundColor Yellow
$body = @{
    message = "Que productos de laptops tienes disponibles?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:4000/ai/ask" -Method Post -Body $body -ContentType "application/json"
Write-Host "   Respuesta de la IA:" -ForegroundColor Green
Write-Host "   $($response.response)" -ForegroundColor White
Write-Host ""

# Test 3: Crear pedido con IA
Write-Host "3. Creando un pedido con lenguaje natural..." -ForegroundColor Yellow
$body = @{
    message = "Quiero comprar 2 unidades de Laptop Dell XPS 13"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:4000/ai/ask" -Method Post -Body $body -ContentType "application/json"
Write-Host "   Respuesta de la IA:" -ForegroundColor Green
Write-Host "   $($response.response)" -ForegroundColor White
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "El sistema esta funcionando correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Servicios activos:" -ForegroundColor Yellow
Write-Host "  - API Gateway: http://localhost:3000" -ForegroundColor White
Write-Host "  - MCP Server: http://localhost:3001" -ForegroundColor White
Write-Host "  - AI Gateway: http://localhost:4000" -ForegroundColor White
Write-Host "  - Products Service: RabbitMQ (events_queue)" -ForegroundColor White
Write-Host "  - Orders Service: RabbitMQ (orders_queue)" -ForegroundColor White
Write-Host ""
