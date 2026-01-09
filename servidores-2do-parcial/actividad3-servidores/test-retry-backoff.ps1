# ==================================================
# PRUEBA 4: Retry con Exponential Backoff
# ==================================================
# Objetivo: Demostrar que el sistema reintenta envios fallidos con backoff exponencial
# Nota: Esta es una prueba MANUAL ya que requiere intervención (apagar/encender Edge Function)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PRUEBA 4: Retry con Exponential Backoff" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANTE: Esta prueba es MANUAL y educativa" -ForegroundColor Yellow
Write-Host "Demuestra el comportamiento de retry en caso de fallo" -ForegroundColor Yellow
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PASO 1: ENTENDER EL CODIGO DE RETRY" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ubicacion: apps/shared/webhook-publisher.service.ts (lineas 84-112)" -ForegroundColor White
Write-Host ""
Write-Host "Configuracion de Reintentos:" -ForegroundColor Green
Write-Host "  - Maximo de intentos: 6" -ForegroundColor White
Write-Host "  - Delays (Exponential Backoff):" -ForegroundColor White
Write-Host "    * Intento 1: Inmediato" -ForegroundColor Gray
Write-Host "    * Intento 2: +1 minuto (60,000 ms)" -ForegroundColor Gray
Write-Host "    * Intento 3: +5 minutos (300,000 ms)" -ForegroundColor Gray
Write-Host "    * Intento 4: +30 minutos (1,800,000 ms)" -ForegroundColor Gray
Write-Host "    * Intento 5: +2 horas (7,200,000 ms)" -ForegroundColor Gray
Write-Host "    * Intento 6: +12 horas (43,200,000 ms)" -ForegroundColor Gray
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PASO 2: SIMULAR FALLO DE EDGE FUNCTION" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "OPCION A: Pausar Edge Function en Supabase" -ForegroundColor Yellow
Write-Host "  1. Ve a: https://supabase.com/dashboard/project/aidmhgugrycsgzzarsou/functions" -ForegroundColor White
Write-Host "  2. Selecciona 'webhook-event-logger'" -ForegroundColor White
Write-Host "  3. Pausa la funcion temporalmente" -ForegroundColor White
Write-Host ""

Write-Host "OPCION B: Simular con URL invalida (MAS FACIL)" -ForegroundColor Yellow
Write-Host "  1. Modifica apps/shared/webhook-publisher.service.ts" -ForegroundColor White
Write-Host "  2. Cambia temporalmente la URL a una invalida" -ForegroundColor White
Write-Host "  3. Observa los reintentos en los logs" -ForegroundColor White
Write-Host ""

Write-Host "OPCION C: Ver evidencia en webhook_deliveries (RECOMENDADO)" -ForegroundColor Yellow
Write-Host "  Los intentos ya registrados se pueden consultar en la BD" -ForegroundColor White
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PASO 3: VER EVIDENCIA DE REINTENTOS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ejecuta en Supabase SQL Editor:" -ForegroundColor Green
Write-Host ""
Write-Host "SELECT " -ForegroundColor White
Write-Host "  we.event_type," -ForegroundColor White
Write-Host "  we.idempotency_key," -ForegroundColor White
Write-Host "  wd.attempt_number," -ForegroundColor White
Write-Host "  wd.status," -ForegroundColor White
Write-Host "  wd.response_status," -ForegroundColor White
Write-Host "  wd.delivered_at," -ForegroundColor White
Write-Host "  wd.response_body" -ForegroundColor White
Write-Host "FROM webhook_deliveries wd" -ForegroundColor White
Write-Host "JOIN webhook_events we ON wd.event_id = we.id" -ForegroundColor White
Write-Host "ORDER BY we.created_at DESC, wd.attempt_number ASC" -ForegroundColor White
Write-Host "LIMIT 50;" -ForegroundColor White
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PASO 4: PRUEBA PRACTICA RAPIDA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Vamos a crear un pedido y ver el comportamiento:" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Deseas crear un pedido de prueba ahora? (S/N)"

if ($confirmation -eq "S" -or $confirmation -eq "s") {
    Write-Host ""
    Write-Host "Creando pedido..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/orders" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body '{"productId": 1, "quantity": 1}'
        
        Write-Host "  Pedido creado: Order ID $($response.data.id)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Ahora revisa los logs de Orders Service para ver:" -ForegroundColor Yellow
        Write-Host "  - Publishing webhook: order.created" -ForegroundColor White
        Write-Host "  - Event logged: success (si funciono)" -ForegroundColor White
        Write-Host "  - O mensajes de reintento (si fallo)" -ForegroundColor White
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "RESULTADO ESPERADO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "ESCENARIO 1: Edge Function ACTIVA" -ForegroundColor Green
Write-Host "  - Intento 1: SUCCESS (200 OK)" -ForegroundColor White
Write-Host "  - Total intentos: 1" -ForegroundColor White
Write-Host "  - Status en BD: 'success'" -ForegroundColor White
Write-Host ""

Write-Host "ESCENARIO 2: Edge Function INACTIVA" -ForegroundColor Red
Write-Host "  - Intento 1: FAILED (timeout/500)" -ForegroundColor White
Write-Host "  - Intento 2: FAILED (despues de 1 min)" -ForegroundColor White
Write-Host "  - Intento 3: FAILED (despues de 5 min)" -ForegroundColor White
Write-Host "  - ... hasta 6 intentos" -ForegroundColor White
Write-Host "  - Status final en BD: 'failed'" -ForegroundColor White
Write-Host ""

Write-Host "ESCENARIO 3: Edge Function REACTIVADA" -ForegroundColor Yellow
Write-Host "  - Intentos 1-3: FAILED" -ForegroundColor White
Write-Host "  - Edge Function reactivada" -ForegroundColor White
Write-Host "  - Intento 4: SUCCESS" -ForegroundColor White
Write-Host "  - Status final: 'success'" -ForegroundColor White
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "CODIGO RELEVANTE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ver implementacion completa en:" -ForegroundColor Yellow
Write-Host "  - apps/shared/webhook-publisher.service.ts (lineas 84-112)" -ForegroundColor White
Write-Host "  - supabase/functions/webhook-external-notifier/index.ts (lineas 28-95)" -ForegroundColor White
Write-Host ""

Write-Host "La resiliencia del sistema esta garantizada por:" -ForegroundColor Green
Write-Host "  1. Retry automatico con backoff exponencial" -ForegroundColor White
Write-Host "  2. Registro de cada intento en webhook_deliveries" -ForegroundColor White
Write-Host "  3. Hasta 6 intentos distribuidos en 12+ horas" -ForegroundColor White
Write-Host "  4. Logs detallados para debugging" -ForegroundColor White
Write-Host ""
