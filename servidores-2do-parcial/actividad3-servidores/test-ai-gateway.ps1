# Test API Gateway AI - Gemini
# Script para probar el API Gateway con Gemini

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS API GATEWAY AI - GEMINI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Test 1: Health Check
Write-Host "Test 1: Health Check (GET /ai/health)" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/ai/health" -Method Get
    Write-Host "✅ Estado: $($health.status)" -ForegroundColor Green
    Write-Host "   API Gateway: $($health.services.api_gateway)" -ForegroundColor Cyan
    Write-Host "   MCP Server: $($health.services.mcp_server)" -ForegroundColor Cyan
    Write-Host "   Gemini: $($health.services.gemini)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Servidor no responde. ¿Está iniciado?" -ForegroundColor Red
    Write-Host "   Ejecuta: npm run start:dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Listar Tools
Write-Host "Test 2: Listar Tools (GET /ai/tools)" -ForegroundColor Yellow
try {
    $tools = Invoke-RestMethod -Uri "$baseUrl/ai/tools" -Method Get
    Write-Host "✅ Tools disponibles: $($tools.total)" -ForegroundColor Green
    foreach ($tool in $tools.tools) {
        Write-Host "   - $($tool.name): $($tool.description)" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "❌ Error obteniendo tools" -ForegroundColor Red
}
Write-Host ""

# Test 3: Pregunta Simple - Buscar Producto
Write-Host "Test 3: Pregunta Simple - Buscar Producto" -ForegroundColor Yellow
$body = @{
    message = "¿Qué productos tienen disponibles?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/ai/ask" -Method Post -Body $body -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ Respuesta de Gemini:" -ForegroundColor Green
        Write-Host ""
        Write-Host $response.answer -ForegroundColor White
    }
    else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error en la petición: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Validar Stock
Write-Host "Test 4: Validar Stock" -ForegroundColor Yellow
$body = @{
    message = "¿Hay stock disponible para comprar 5 unidades del producto 1?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/ai/ask" -Method Post -Body $body -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ Respuesta de Gemini:" -ForegroundColor Green
        Write-Host ""
        Write-Host $response.answer -ForegroundColor White
    }
    else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error en la petición: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Crear Pedido
Write-Host "Test 5: Crear Pedido con IA" -ForegroundColor Yellow
$body = @{
    message = "Quiero hacer un pedido de 2 unidades del producto 1"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/ai/ask" -Method Post -Body $body -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ Respuesta de Gemini:" -ForegroundColor Green
        Write-Host ""
        Write-Host $response.answer -ForegroundColor White
    }
    else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error en la petición: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Operación Compleja
Write-Host "Test 6: Operación Compleja (múltiples tools)" -ForegroundColor Yellow
$body = @{
    message = "Busca el producto con ID 1, verifica si hay stock para 3 unidades y si hay disponibilidad, créame un pedido"
} | ConvertTo-Json

try {
    Write-Host "⏳ Procesando (esto puede tardar unos segundos)..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri "$baseUrl/ai/ask" -Method Post -Body $body -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ Respuesta de Gemini:" -ForegroundColor Green
        Write-Host ""
        Write-Host $response.answer -ForegroundColor White
    }
    else {
        Write-Host "❌ Error: $($response.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Error en la petición: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Prueba con tus propias preguntas:" -ForegroundColor Yellow
Write-Host '   curl -X POST http://localhost:3000/ai/ask \' -ForegroundColor Gray
Write-Host '     -H "Content-Type: application/json" \' -ForegroundColor Gray
Write-Host '     -d ''{"message": "Tu pregunta aquí"}''' -ForegroundColor Gray
Write-Host ""
