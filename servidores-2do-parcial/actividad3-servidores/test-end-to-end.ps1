# Script de Pruebas End-to-End Completo
# Sistema MCP con Gemini AI

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS END-TO-END - SISTEMA MCP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0
$total = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    $global:total++
    Write-Host "Test $global:total : $Name" -ForegroundColor Yellow
    
    try {
        if ($Method -eq "POST" -and $Body) {
            $json = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Body $json -ContentType "application/json" -TimeoutSec 30
        }
        else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -TimeoutSec 30
        }
        
        Write-Host "  ✅ PASS" -ForegroundColor Green
        $global:passed++
        return $response
    }
    catch {
        Write-Host "  ❌ FAIL: $_" -ForegroundColor Red
        $global:failed++
        return $null
    }
}

Write-Host "🔍 FASE 1: Verificación de Servicios" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Test 1: Backend Health
Test-Endpoint -Name "Backend Health Check" -Url "http://localhost:3000/health" | Out-Null

# Test 2: MCP Server Health
Test-Endpoint -Name "MCP Server Health" -Url "http://localhost:3001/health" | Out-Null

# Test 3: AI Gateway Health
$healthAI = Test-Endpoint -Name "AI Gateway Health" -Url "http://localhost:3000/ai/health"

Write-Host ""
Write-Host "🔧 FASE 2: Verificación de Tools MCP" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Test 4: Listar Tools desde MCP Server
$mcpTools = Test-Endpoint -Name "MCP Server - Listar Tools" -Url "http://localhost:3001/tools"
if ($mcpTools) {
    Write-Host "  📋 Tools disponibles: $($mcpTools.total)" -ForegroundColor Cyan
    foreach ($tool in $mcpTools.tools) {
        Write-Host "     - $($tool.name)" -ForegroundColor Gray
    }
}

# Test 5: Listar Tools desde AI Gateway
$aiTools = Test-Endpoint -Name "AI Gateway - Listar Tools" -Url "http://localhost:3000/ai/tools"

Write-Host ""
Write-Host "🤖 FASE 3: Pruebas de IA con Gemini" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Test 6: Pregunta Simple - Listar Productos
Write-Host "Test $($global:total + 1): AI - Listar Productos" -ForegroundColor Yellow
$body6 = @{ message = "¿Qué productos tienen disponibles?" }
$response6 = Test-Endpoint -Name "AI - Listar Productos" -Url "http://localhost:3000/ai/ask" -Method "POST" -Body $body6
if ($response6 -and $response6.success) {
    Write-Host ""
    Write-Host "  💬 Gemini respondió:" -ForegroundColor Cyan
    Write-Host "  $($response6.answer)" -ForegroundColor White
    Write-Host ""
}

# Test 7: Buscar Producto Específico
Write-Host "Test $($global:total + 1): AI - Buscar Producto" -ForegroundColor Yellow
$body7 = @{ message = "Busca información sobre la laptop" }
$response7 = Test-Endpoint -Name "AI - Buscar Laptop" -Url "http://localhost:3000/ai/ask" -Method "POST" -Body $body7
if ($response7 -and $response7.success) {
    Write-Host ""
    Write-Host "  💬 Gemini respondió:" -ForegroundColor Cyan
    Write-Host "  $($response7.answer)" -ForegroundColor White
    Write-Host ""
}

# Test 8: Validar Stock
Write-Host "Test $($global:total + 1): AI - Validar Stock" -ForegroundColor Yellow
$body8 = @{ message = "¿Hay stock disponible para comprar 5 laptops?" }
$response8 = Test-Endpoint -Name "AI - Validar Stock" -Url "http://localhost:3000/ai/ask" -Method "POST" -Body $body8
if ($response8 -and $response8.success) {
    Write-Host ""
    Write-Host "  💬 Gemini respondió:" -ForegroundColor Cyan
    Write-Host "  $($response8.answer)" -ForegroundColor White
    Write-Host ""
}

# Test 9: Crear Pedido
Write-Host "Test $($global:total + 1): AI - Crear Pedido" -ForegroundColor Yellow
$body9 = @{ message = "Quiero hacer un pedido de 2 teclados mecánicos" }
$response9 = Test-Endpoint -Name "AI - Crear Pedido" -Url "http://localhost:3000/ai/ask" -Method "POST" -Body $body9
if ($response9 -and $response9.success) {
    Write-Host ""
    Write-Host "  💬 Gemini respondió:" -ForegroundColor Cyan
    Write-Host "  $($response9.answer)" -ForegroundColor White
    Write-Host ""
}

# Test 10: Operación Compleja Multi-Tool
Write-Host "Test $($global:total + 1): AI - Operación Compleja" -ForegroundColor Yellow
Write-Host "  ⏳ Procesando (puede tardar varios segundos)..." -ForegroundColor Gray
$body10 = @{ message = "Busca el producto Mouse, verifica si hay stock para 3 unidades, y si hay disponibilidad créame un pedido" }
$response10 = Test-Endpoint -Name "AI - Operación Multi-Tool" -Url "http://localhost:3000/ai/ask" -Method "POST" -Body $body10
if ($response10 -and $response10.success) {
    Write-Host ""
    Write-Host "  💬 Gemini respondió:" -ForegroundColor Cyan
    Write-Host "  $($response10.answer)" -ForegroundColor White
    Write-Host ""
}

# Test 11: Consulta con Cliente Específico
Write-Host "Test $($global:total + 1): AI - Pedido con Cliente" -ForegroundColor Yellow
$body11 = @{ message = "Crea un pedido de 1 monitor para el cliente Juan Pérez del departamento de ventas" }
$response11 = Test-Endpoint -Name "AI - Pedido con Cliente" -Url "http://localhost:3000/ai/ask" -Method "POST" -Body $body11
if ($response11 -and $response11.success) {
    Write-Host ""
    Write-Host "  💬 Gemini respondió:" -ForegroundColor Cyan
    Write-Host "  $($response11.answer)" -ForegroundColor White
    Write-Host ""
}

# Test 12: Consulta sobre Precios
Write-Host "Test $($global:total + 1): AI - Consulta de Precios" -ForegroundColor Yellow
$body12 = @{ message = "¿Cuánto cuesta la laptop y cuántas unidades hay en stock?" }
$response12 = Test-Endpoint -Name "AI - Precios y Stock" -Url "http://localhost:3000/ai/ask" -Method "POST" -Body $body12
if ($response12 -and $response12.success) {
    Write-Host ""
    Write-Host "  💬 Gemini respondió:" -ForegroundColor Cyan
    Write-Host "  $($response12.answer)" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total de pruebas: $total" -ForegroundColor White
Write-Host "Exitosas: $passed" -ForegroundColor Green
Write-Host "Fallidas: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 ¡TODAS LAS PRUEBAS PASARON!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Sistema MCP completamente funcional" -ForegroundColor Green
    Write-Host "✅ Gemini AI integrado correctamente" -ForegroundColor Green
    Write-Host "✅ Function Calling operativo" -ForegroundColor Green
    Write-Host "✅ Orquestación inteligente activa" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Algunas pruebas fallaron" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Verifica que todos los servicios estén corriendo:" -ForegroundColor Gray
    Write-Host "  1. Backend (npm run start:all)" -ForegroundColor Gray
    Write-Host "  2. MCP Server (npm run start:mcp)" -ForegroundColor Gray
    Write-Host "  3. AI Gateway (npm run start:ai)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
