# Script de Pruebas Completas
# Este script ejecuta un flujo completo de pruebas

Write-Host "🚀 Iniciando pruebas del sistema de microservicios" -ForegroundColor Green
Write-Host ""

# Variables
$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "📋 Paso 1: Verificar que los servicios estén corriendo..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ API Gateway está activo" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: API Gateway no responde. Asegúrate de iniciar los servicios con 'docker-compose up -d'" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Paso 2: Crear tipos de vehículo..." -ForegroundColor Yellow

# Crear tipo Sedán
$sedan = @{
    nombre = "Sedán"
    descripcion = "Vehículo de pasajeros con 4 puertas"
    capacidadPasajeros = 5
    categoria = "Automóvil"
} | ConvertTo-Json

try {
    $sedanResponse = Invoke-RestMethod -Uri "$baseUrl/tipo-vehiculo" -Method POST -Headers $headers -Body $sedan
    $sedanId = $sedanResponse.data.id
    Write-Host "✅ Tipo Sedán creado con ID: $sedanId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear tipo Sedán: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Crear tipo SUV
$suv = @{
    nombre = "SUV"
    descripcion = "Vehículo utilitario deportivo"
    capacidadPasajeros = 7
    categoria = "Camioneta"
} | ConvertTo-Json

try {
    $suvResponse = Invoke-RestMethod -Uri "$baseUrl/tipo-vehiculo" -Method POST -Headers $headers -Body $suv
    $suvId = $suvResponse.data.id
    Write-Host "✅ Tipo SUV creado con ID: $suvId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear tipo SUV: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Crear tipo Pickup
$pickup = @{
    nombre = "Pickup"
    descripcion = "Camioneta de carga"
    capacidadPasajeros = 2
    categoria = "Camioneta"
} | ConvertTo-Json

try {
    $pickupResponse = Invoke-RestMethod -Uri "$baseUrl/tipo-vehiculo" -Method POST -Headers $headers -Body $pickup
    $pickupId = $pickupResponse.data.id
    Write-Host "✅ Tipo Pickup creado con ID: $pickupId" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear tipo Pickup: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Paso 3: Listar tipos de vehículo..." -ForegroundColor Yellow
try {
    $tipos = Invoke-RestMethod -Uri "$baseUrl/tipo-vehiculo" -Method GET
    Write-Host "✅ Total de tipos: $($tipos.total)" -ForegroundColor Green
    $tipos.data | ForEach-Object {
        Write-Host "   - $($_.nombre): $($_.descripcion)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error al listar tipos: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "⏱️  Esperando 2 segundos para que CDC procese eventos..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "📋 Paso 4: Crear vehículos..." -ForegroundColor Yellow

# Crear vehículo Toyota
$toyota = @{
    placa = "ABC-123"
    marca = "Toyota"
    modelo = "Corolla"
    anio = 2023
    color = "Blanco"
    tipoVehiculoId = $sedanId
    numeroSerie = "JTDBL40E499123456"
} | ConvertTo-Json

try {
    $toyotaResponse = Invoke-RestMethod -Uri "$baseUrl/vehiculo" -Method POST -Headers $headers -Body $toyota
    Write-Host "✅ Vehículo Toyota creado: Placa $($toyotaResponse.data.placa)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear vehículo Toyota: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Crear vehículo Ford
$ford = @{
    placa = "XYZ-789"
    marca = "Ford"
    modelo = "Explorer"
    anio = 2024
    color = "Negro"
    tipoVehiculoId = $suvId
    numeroSerie = "1FMCU9GD9KUA12345"
} | ConvertTo-Json

try {
    $fordResponse = Invoke-RestMethod -Uri "$baseUrl/vehiculo" -Method POST -Headers $headers -Body $ford
    Write-Host "✅ Vehículo Ford creado: Placa $($fordResponse.data.placa)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear vehículo Ford: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Crear vehículo Chevrolet
$chevy = @{
    placa = "DEF-456"
    marca = "Chevrolet"
    modelo = "Silverado"
    anio = 2024
    color = "Rojo"
    tipoVehiculoId = $pickupId
    numeroSerie = "1GCUKREC8FZ123456"
} | ConvertTo-Json

try {
    $chevyResponse = Invoke-RestMethod -Uri "$baseUrl/vehiculo" -Method POST -Headers $headers -Body $chevy
    Write-Host "✅ Vehículo Chevrolet creado: Placa $($chevyResponse.data.placa)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al crear vehículo Chevrolet: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Paso 5: Listar vehículos..." -ForegroundColor Yellow
try {
    $vehiculos = Invoke-RestMethod -Uri "$baseUrl/vehiculo" -Method GET
    Write-Host "✅ Total de vehículos: $($vehiculos.total)" -ForegroundColor Green
    $vehiculos.data | ForEach-Object {
        Write-Host "   - $($_.placa): $($_.marca) $($_.modelo) ($($_.tipoVehiculoNombre))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error al listar vehículos: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Paso 6: Actualizar tipo de vehículo (probar CDC)..." -ForegroundColor Yellow
$updateSuv = @{
    capacidadPasajeros = 8
    descripcion = "SUV de lujo con 8 pasajeros"
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/tipo-vehiculo/$suvId" -Method PUT -Headers $headers -Body $updateSuv
    Write-Host "✅ Tipo SUV actualizado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al actualizar tipo SUV: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "⏱️  Esperando 2 segundos para que el evento se propague..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "📋 Paso 7: Prueba de validación (crear vehículo con tipo inexistente)..." -ForegroundColor Yellow
$invalidVehiculo = @{
    placa = "INVALID-001"
    marca = "Test"
    modelo = "Test"
    anio = 2023
    color = "Test"
    tipoVehiculoId = "00000000-0000-0000-0000-000000000000"
} | ConvertTo-Json

try {
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/vehiculo" -Method POST -Headers $headers -Body $invalidVehiculo
    Write-Host "⚠️  Advertencia: Se esperaba un error pero la petición fue exitosa" -ForegroundColor Yellow
} catch {
    Write-Host "✅ Validación funcionó correctamente: $($_.Exception.Message)" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Paso 8: Verificar estado final..." -ForegroundColor Yellow
try {
    $tiposFinal = Invoke-RestMethod -Uri "$baseUrl/tipo-vehiculo" -Method GET
    $vehiculosFinal = Invoke-RestMethod -Uri "$baseUrl/vehiculo" -Method GET
    
    Write-Host "✅ Estado final del sistema:" -ForegroundColor Green
    Write-Host "   - Tipos de vehículo: $($tiposFinal.total)" -ForegroundColor Cyan
    Write-Host "   - Vehículos: $($vehiculosFinal.total)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error al obtener estado final: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Pruebas completadas!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Para ver más detalles:" -ForegroundColor Yellow
Write-Host "   - RabbitMQ Management: http://localhost:15672 (admin/admin123)" -ForegroundColor Cyan
Write-Host "   - Logs de servicios: docker-compose logs -f" -ForegroundColor Cyan
Write-Host ""
