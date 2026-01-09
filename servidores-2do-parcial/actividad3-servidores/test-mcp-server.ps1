# Test MCP Server - JSON-RPC
# Este script prueba los endpoints del MCP Server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS MCP SERVER - JSON-RPC 2.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"

# Función para hacer requests JSON-RPC
function Invoke-JSONRPC {
    param(
        [string]$Method,
        [object]$Params = $null,
        [int]$Id = 1
    )
    
    $body = @{
        jsonrpc = "2.0"
        method = $Method
        id = $Id
    }
    
    if ($Params) {
        $body.params = $Params
    }
    
    $json = $body | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/rpc" -Method Post -Body $json -ContentType "application/json"
        return $response
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        return $null
    }
}

# Test 1: Health Check
Write-Host "Test 1: Health Check (GET /health)" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Servidor: $($health.status)" -ForegroundColor Green
    Write-Host "   Backend: $($health.backend.healthy)" -ForegroundColor Green
    Write-Host "   Tools disponibles: $($health.tools.available)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Servidor no responde. ¿Está iniciado?" -ForegroundColor Red
    Write-Host "   Ejecuta: npm run dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Listar Tools
Write-Host "Test 2: Listar Tools (tools/list)" -ForegroundColor Yellow
$result = Invoke-JSONRPC -Method "tools/list" -Id 1
if ($result) {
    Write-Host "✅ Tools encontrados: $($result.result.total)" -ForegroundColor Green
    foreach ($tool in $result.result.tools) {
        Write-Host "   - $($tool.name): $($tool.description)" -ForegroundColor Cyan
    }
}
Write-Host ""

# Test 3: Ping
Write-Host "Test 3: Ping" -ForegroundColor Yellow
$result = Invoke-JSONRPC -Method "ping" -Id 2
if ($result) {
    Write-Host "✅ Ping exitoso" -ForegroundColor Green
    Write-Host "   Status: $($result.result.status)" -ForegroundColor Cyan
    Write-Host "   Backend: $($result.result.backend)" -ForegroundColor Cyan
}
Write-Host ""

# Test 4: Buscar Producto (si el backend está corriendo)
Write-Host "Test 4: Buscar Producto (tools/call)" -ForegroundColor Yellow
$params = @{
    name = "buscar_producto"
    arguments = @{
        id = 1
    }
}
$result = Invoke-JSONRPC -Method "tools/call" -Params $params -Id 3
if ($result) {
    if ($result.result.isError) {
        Write-Host "⚠️  Error en tool: $($result.result.content[0].text)" -ForegroundColor Yellow
    }
    else {
        Write-Host "✅ Tool ejecutado exitosamente" -ForegroundColor Green
        Write-Host "   Mensaje: $($result.result.content[0].text)" -ForegroundColor Cyan
    }
}
Write-Host ""

# Test 5: Validar Stock
Write-Host "Test 5: Validar Stock (tools/call)" -ForegroundColor Yellow
$params = @{
    name = "validar_stock"
    arguments = @{
        productId = 1
        cantidad = 5
    }
}
$result = Invoke-JSONRPC -Method "tools/call" -Params $params -Id 4
if ($result) {
    if ($result.result.isError) {
        Write-Host "⚠️  Error en tool: $($result.result.content[0].text)" -ForegroundColor Yellow
    }
    else {
        Write-Host "✅ Tool ejecutado exitosamente" -ForegroundColor Green
        Write-Host "   Mensaje: $($result.result.content[0].text)" -ForegroundColor Cyan
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Notas:" -ForegroundColor Yellow
Write-Host "   - Si los tests 4 y 5 fallan, asegúrate de que:" -ForegroundColor Gray
Write-Host "     1. El backend esté corriendo en puerto 3000" -ForegroundColor Gray
Write-Host "     2. Haya productos creados en la BD" -ForegroundColor Gray
Write-Host ""
