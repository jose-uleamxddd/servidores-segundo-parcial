# ==================================================
# PRUEBA 3: Idempotencia - Procesamiento Unico
# ==================================================
# Objetivo: Demostrar que eventos duplicados se procesan solo UNA vez
# Resultado esperado: 
#   - 1er envio: Procesado exitosamente
#   - 2do envio: Rechazado (duplicate)
#   - 3er envio: Rechazado (duplicate)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PRUEBA 3: Idempotencia (Deduplicacion)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Paso 1: Creando 3 pedidos para generar eventos" -ForegroundColor Yellow
Write-Host ""

$results = @()

for ($i = 1; $i -le 3; $i++) {
    Write-Host "--- Intento $i/3 ---" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/orders" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body '{"productId": 1, "quantity": 1}'
        
        Write-Host "  Pedido creado: Order ID $($response.data.id)" -ForegroundColor White
        
        $results += @{
            attempt = $i
            orderId = $response.data.id
            status = "success"
        }
        
        # Esperar 2 segundos entre intentos
        if ($i -lt 3) {
            Write-Host "  Esperando 2 segundos..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{
            attempt = $i
            status = "failed"
            error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

Write-Host "Paso 2: Esperando procesamiento completo (5 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

Write-Host "Paso 3: Consultando eventos procesados en Supabase" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ejecuta esta consulta SQL en Supabase SQL Editor:" -ForegroundColor Cyan
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  idempotency_key," -ForegroundColor White
Write-Host "  event_type," -ForegroundColor White
Write-Host "  processed_at," -ForegroundColor White
Write-Host "  metadata" -ForegroundColor White
Write-Host "FROM processed_webhooks" -ForegroundColor White
Write-Host "ORDER BY processed_at DESC" -ForegroundColor White
Write-Host "LIMIT 10;" -ForegroundColor White
Write-Host ""

Write-Host "Paso 4: Verificar tabla webhook_events" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ejecuta esta consulta para contar eventos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  event_type," -ForegroundColor White
Write-Host "  COUNT(*) as total_events" -ForegroundColor White
Write-Host "FROM webhook_events" -ForegroundColor White
Write-Host "GROUP BY event_type;" -ForegroundColor White
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "RESULTADO ESPERADO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Cada pedido genera 2 eventos:" -ForegroundColor Green
Write-Host "   - order.created (cuando se crea)" -ForegroundColor White
Write-Host "   - product.stock.reserved (cuando se reserva stock)" -ForegroundColor White
Write-Host ""
Write-Host "2. Cada evento tiene idempotency_key UNICO" -ForegroundColor Green
Write-Host "   Ejemplo: order-created-42-[uuid-unico]" -ForegroundColor White
Write-Host ""
Write-Host "3. Si intentas enviar el MISMO webhook 2 veces:" -ForegroundColor Green
Write-Host "   - 1ra vez: Procesado y guardado" -ForegroundColor White
Write-Host "   - 2da vez: Rechazado con {duplicate: true}" -ForegroundColor White
Write-Host ""
Write-Host "4. Tabla processed_webhooks debe tener:" -ForegroundColor Green
Write-Host "   - 1 registro por cada idempotency_key" -ForegroundColor White
Write-Host "   - SIN duplicados" -ForegroundColor White
Write-Host ""

Write-Host "Pedidos creados en esta prueba:" -ForegroundColor Yellow
foreach ($result in $results) {
    if ($result.status -eq "success") {
        Write-Host "  - Order ID: $($result.orderId)" -ForegroundColor White
    }
}
Write-Host ""
