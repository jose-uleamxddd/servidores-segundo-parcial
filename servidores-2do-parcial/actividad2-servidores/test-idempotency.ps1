# Script para probar idempotencia
# Envía el mismo pedido múltiples veces simultáneamente

Write-Host "`n🧪 PRUEBA DE IDEMPOTENCIA" -ForegroundColor Cyan
Write-Host "Enviando 5 pedidos IDÉNTICOS simultáneamente..." -ForegroundColor Yellow
Write-Host "Solo UNO debe procesarse, los demás deben ser ignorados.`n" -ForegroundColor Yellow

$body = @{
    productId = 1
    quantity = 1
} | ConvertTo-Json

# Verificar stock inicial
Write-Host "📦 Stock ANTES del test:" -ForegroundColor Cyan
docker exec mysql-products mysql -uroot -proot products_db -e "SELECT id, name, stock FROM products WHERE id=1;" 2>$null

Write-Host "`n🚀 Enviando 5 pedidos simultáneos..." -ForegroundColor Yellow

# Enviar 5 pedidos simultáneos
$jobs = @()
1..5 | ForEach-Object {
    $jobs += Start-Job -ScriptBlock {
        param($body, $num)
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/orders" -Method POST -Body $body -ContentType "application/json"
            Write-Host "Pedido $num creado: Order ID = $($response.data.id)" -ForegroundColor Green
        } catch {
            Write-Host "Pedido $num falló: $($_.Exception.Message)" -ForegroundColor Red
        }
    } -ArgumentList $body, $_
}

# Esperar a que todos terminen
$jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

Start-Sleep -Seconds 3

Write-Host "`n📊 RESULTADOS:" -ForegroundColor Cyan

# Ver stock final
Write-Host "`n📦 Stock DESPUÉS del test:" -ForegroundColor Cyan
docker exec mysql-products mysql -uroot -proot products_db -e "SELECT id, name, stock FROM products WHERE id=1;" 2>$null

# Ver pedidos creados
Write-Host "`n📝 Pedidos creados:" -ForegroundColor Cyan
docker exec mysql-orders mysql -uroot -proot orders_db -e "SELECT id, productId, quantity, status, createdAt FROM orders ORDER BY id DESC LIMIT 5;" 2>$null

Write-Host "`n✅ Si la idempotencia funciona correctamente:" -ForegroundColor Green
Write-Host "   - El stock debe haber bajado solo 1 unidad" -ForegroundColor White
Write-Host "   - Debe haber solo 1 pedido nuevo con status CONFIRMED" -ForegroundColor White
Write-Host "`n⚠️ Si NO funciona (sin idempotencia):" -ForegroundColor Yellow
Write-Host "   - El stock bajaría 5 unidades" -ForegroundColor White
Write-Host "   - Habría 5 pedidos CONFIRMED" -ForegroundColor White
