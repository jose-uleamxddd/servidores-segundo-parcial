# Script simple para insertar datos de prueba

Write-Host "Insertando productos de prueba..." -ForegroundColor Cyan

$productos = @(
    @{nombre="Laptop Dell XPS 15"; precio=1299.99; stock=15},
    @{nombre="Teclado Mecanico RGB"; precio=89.99; stock=50},
    @{nombre="Mouse Gaming Logitech"; precio=29.99; stock=100},
    @{nombre="Monitor 4K Samsung 27"; precio=399.99; stock=25},
    @{nombre="Webcam HD Logitech"; precio=79.99; stock=40},
    @{nombre="Auriculares Bluetooth Sony"; precio=199.99; stock=30},
    @{nombre="SSD 1TB Samsung"; precio=149.99; stock=60},
    @{nombre="RAM 16GB DDR4"; precio=89.99; stock=75},
    @{nombre="Hub USB-C 7 Puertos"; precio=45.99; stock=35},
    @{nombre="Mousepad Gaming XXL"; precio=24.99; stock=90}
)

$contador = 0
foreach ($p in $productos) {
    $sql = "INSERT INTO products (name, price, stock, createdAt, updatedAt) VALUES ('$($p.nombre)', $($p.precio), $($p.stock), NOW(), NOW());"
    
    docker exec -i mysql-products mysql -uroot -proot products_db -e "$sql" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        $contador++
        Write-Host "  [OK] $($p.nombre)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $($p.nombre)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Productos insertados: $contador/10" -ForegroundColor Cyan

# Verificar
Write-Host ""
Write-Host "Verificando productos en BD..." -ForegroundColor Yellow
docker exec -i mysql-products mysql -uroot -proot products_db -e "SELECT id, name, price, stock FROM products;" 2>$null
