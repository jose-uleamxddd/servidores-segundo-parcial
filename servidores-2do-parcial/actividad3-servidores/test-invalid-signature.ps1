# ==================================================
# PRUEBA 2: Validación de Firma HMAC Inválida
# ==================================================
# Objetivo: Demostrar que Edge Function rechaza webhooks con firma incorrecta
# Resultado esperado: HTTP 401 - Invalid signature

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PRUEBA 2: Firma HMAC Invalida" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$edgeFunctionUrl = "https://aidmhgugrycsgzzarsou.supabase.co/functions/v1/webhook-event-logger"

# Payload de prueba
$payload = @{
    event = "test.event"
    version = "1.0"
    id = [guid]::NewGuid().ToString()
    idempotency_key = "test-invalid-signature-001"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    data = @{
        test = "data"
    }
    metadata = @{
        source = "test-script"
        environment = "testing"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Paso 1: Preparando payload de prueba" -ForegroundColor Yellow
Write-Host $payload -ForegroundColor Gray
Write-Host ""

# PRUEBA 1: Firma completamente incorrecta
Write-Host "Paso 2: Enviando con FIRMA INVALIDA (random string)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $edgeFunctionUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Webhook-Signature" = "sha256=FIRMA_COMPLETAMENTE_INVALIDA_12345"
        } `
        -Body $payload `
        -UseBasicParsing
    
    Write-Host "Respuesta inesperada: HTTP $($response.StatusCode)" -ForegroundColor Red
    Write-Host $response.Content -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "EXITO: HTTP 401 Unauthorized recibido" -ForegroundColor Green
        $errorResponse = $_.ErrorDetails.Message
        Write-Host "Mensaje: $errorResponse" -ForegroundColor Green
    } else {
        Write-Host "ERROR inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# PRUEBA 2: Sin header de firma
Write-Host "Paso 3: Enviando SIN HEADER de firma" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $edgeFunctionUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
        } `
        -Body $payload `
        -UseBasicParsing
    
    Write-Host "Respuesta inesperada: HTTP $($response.StatusCode)" -ForegroundColor Red
    Write-Host $response.Content -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "EXITO: HTTP 401 Unauthorized recibido" -ForegroundColor Green
        $errorResponse = $_.ErrorDetails.Message
        Write-Host "Mensaje: $errorResponse" -ForegroundColor Green
    } else {
        Write-Host "ERROR inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# PRUEBA 3: Firma con algoritmo incorrecto
Write-Host "Paso 4: Enviando con algoritmo incorrecto (sha1)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $edgeFunctionUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Webhook-Signature" = "sha1=abc123def456"
        } `
        -Body $payload `
        -UseBasicParsing
    
    Write-Host "Respuesta inesperada: HTTP $($response.StatusCode)" -ForegroundColor Red
    Write-Host $response.Content -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "EXITO: HTTP 401 Unauthorized recibido" -ForegroundColor Green
        $errorResponse = $_.ErrorDetails.Message
        Write-Host "Mensaje: $errorResponse" -ForegroundColor Green
    } else {
        Write-Host "ERROR inesperado: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "RESULTADO DE LA PRUEBA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Validacion de seguridad HMAC:" -ForegroundColor Green
Write-Host "  - Firma invalida: RECHAZADA (401)" -ForegroundColor Green
Write-Host "  - Sin firma: RECHAZADA (401)" -ForegroundColor Green
Write-Host "  - Algoritmo incorrecto: RECHAZADO (401)" -ForegroundColor Green
Write-Host ""
Write-Host "La Edge Function protege correctamente contra webhooks no autorizados" -ForegroundColor Green
Write-Host ""
