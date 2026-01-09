# ==================================================
# PRUEBA 5: Webhook Delivery Tracking
# ==================================================
# Objetivo: Consultar y visualizar el tracking completo de entregas de webhooks
# Muestra: Intentos, estados, tiempos de respuesta

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PRUEBA 5: Webhook Delivery Tracking" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Esta prueba muestra como rastrear todas las entregas de webhooks" -ForegroundColor Yellow
Write-Host ""

Write-Host "Paso 1: Crear un pedido para generar eventos" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/orders" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"productId": 1, "quantity": 2}'
    
    Write-Host "  Pedido creado: Order ID $($response.data.id)" -ForegroundColor Green
    $orderId = $response.data.id
} catch {
    Write-Host "  Error creando pedido: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Paso 2: Esperando procesamiento (5 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "CONSULTAS SQL PARA TRACKING" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. VER TODOS LOS EVENTOS REGISTRADOS" -ForegroundColor Green
Write-Host "---------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  event_type," -ForegroundColor White
Write-Host "  idempotency_key," -ForegroundColor White
Write-Host "  created_at," -ForegroundColor White
Write-Host "  payload->>'data' as event_data" -ForegroundColor White
Write-Host "FROM webhook_events" -ForegroundColor White
Write-Host "ORDER BY created_at DESC" -ForegroundColor White
Write-Host "LIMIT 10;" -ForegroundColor White
Write-Host ""
Write-Host ""

Write-Host "2. VER INTENTOS DE ENTREGA (Deliveries)" -ForegroundColor Green
Write-Host "---------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  wd.attempt_number," -ForegroundColor White
Write-Host "  wd.status," -ForegroundColor White
Write-Host "  wd.response_status," -ForegroundColor White
Write-Host "  wd.delivered_at," -ForegroundColor White
Write-Host "  we.event_type," -ForegroundColor White
Write-Host "  we.idempotency_key" -ForegroundColor White
Write-Host "FROM webhook_deliveries wd" -ForegroundColor White
Write-Host "JOIN webhook_events we ON wd.event_id = we.id" -ForegroundColor White
Write-Host "ORDER BY wd.delivered_at DESC" -ForegroundColor White
Write-Host "LIMIT 20;" -ForegroundColor White
Write-Host ""
Write-Host ""

Write-Host "3. ESTADISTICAS DE ENTREGAS" -ForegroundColor Green
Write-Host "---------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  status," -ForegroundColor White
Write-Host "  COUNT(*) as total," -ForegroundColor White
Write-Host "  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM webhook_deliveries), 2) as percentage" -ForegroundColor White
Write-Host "FROM webhook_deliveries" -ForegroundColor White
Write-Host "GROUP BY status;" -ForegroundColor White
Write-Host ""
Write-Host ""

Write-Host "4. EVENTOS CON MULTIPLES INTENTOS (Reintentos)" -ForegroundColor Green
Write-Host "---------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  we.event_type," -ForegroundColor White
Write-Host "  we.idempotency_key," -ForegroundColor White
Write-Host "  COUNT(wd.id) as total_attempts," -ForegroundColor White
Write-Host "  MAX(wd.attempt_number) as max_attempt" -ForegroundColor White
Write-Host "FROM webhook_events we" -ForegroundColor White
Write-Host "LEFT JOIN webhook_deliveries wd ON wd.event_id = we.id" -ForegroundColor White
Write-Host "GROUP BY we.id, we.event_type, we.idempotency_key" -ForegroundColor White
Write-Host "HAVING COUNT(wd.id) > 1" -ForegroundColor White
Write-Host "ORDER BY total_attempts DESC;" -ForegroundColor White
Write-Host ""
Write-Host ""

Write-Host "5. EVENTOS PROCESADOS (Idempotencia)" -ForegroundColor Green
Write-Host "---------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  idempotency_key," -ForegroundColor White
Write-Host "  event_type," -ForegroundColor White
Write-Host "  processed_at," -ForegroundColor White
Write-Host "  metadata->>'source' as source" -ForegroundColor White
Write-Host "FROM processed_webhooks" -ForegroundColor White
Write-Host "ORDER BY processed_at DESC" -ForegroundColor White
Write-Host "LIMIT 10;" -ForegroundColor White
Write-Host ""
Write-Host ""

Write-Host "6. TIMELINE COMPLETO DE UN EVENTO" -ForegroundColor Green
Write-Host "---------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Reemplaza 'order-created-XX-...' con tu idempotency_key real" -ForegroundColor Gray
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  we.event_type," -ForegroundColor White
Write-Host "  we.created_at as event_created," -ForegroundColor White
Write-Host "  pw.processed_at," -ForegroundColor White
Write-Host "  wd.attempt_number," -ForegroundColor White
Write-Host "  wd.status," -ForegroundColor White
Write-Host "  wd.delivered_at" -ForegroundColor White
Write-Host "FROM webhook_events we" -ForegroundColor White
Write-Host "LEFT JOIN processed_webhooks pw ON pw.idempotency_key = we.idempotency_key" -ForegroundColor White
Write-Host "LEFT JOIN webhook_deliveries wd ON wd.event_id = we.id" -ForegroundColor White
Write-Host "WHERE we.idempotency_key LIKE 'order-created-$orderId%'" -ForegroundColor White
Write-Host "ORDER BY wd.attempt_number;" -ForegroundColor White
Write-Host ""
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "INSTRUCCIONES" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ve a Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/aidmhgugrycsgzzarsou/editor" -ForegroundColor White
Write-Host ""
Write-Host "2. Copia y ejecuta las consultas SQL de arriba" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Verifica que:" -ForegroundColor Yellow
Write-Host "   - Todos los eventos estan registrados" -ForegroundColor White
Write-Host "   - Cada evento tiene su delivery tracking" -ForegroundColor White
Write-Host "   - Los intentos fallidos se registran correctamente" -ForegroundColor White
Write-Host "   - La idempotencia funciona (sin duplicados)" -ForegroundColor White
Write-Host ""

Write-Host "RESULTADO ESPERADO:" -ForegroundColor Green
Write-Host "  - webhook_events: 2 eventos (order.created + product.stock.reserved)" -ForegroundColor White
Write-Host "  - processed_webhooks: 2 registros (1 por cada idempotency_key)" -ForegroundColor White
Write-Host "  - webhook_deliveries: Variable segun suscriptores activos" -ForegroundColor White
Write-Host ""
