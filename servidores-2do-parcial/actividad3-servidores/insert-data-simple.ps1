# Script simple para insertar datos de prueba
Write-Host "Insertando datos de prueba en MySQL..." -ForegroundColor Cyan

# SQL para productos
$sqlProducts = @'
USE products_db;
INSERT INTO products (name, price, stock, createdAt, updatedAt) VALUES 
('Laptop Dell XPS 13', 1299.99, 15, NOW(), NOW()),
('Mouse Logitech MX Master', 99.99, 50, NOW(), NOW()),
('Teclado Mecánico Keychron', 89.99, 30, NOW(), NOW()),
('Monitor LG 27 4K', 449.99, 20, NOW(), NOW()),
('Webcam Logitech C920', 79.99, 25, NOW(), NOW());
'@

# Ejecutar SQL de productos
Write-Host "Insertando productos..." -ForegroundColor Yellow
$sqlProducts | docker exec -i mysql-products mysql -uroot -proot

if ($LASTEXITCODE -eq 0) {
    Write-Host "Productos insertados correctamente" -ForegroundColor Green
    
    # Mostrar productos
    Write-Host "`nProductos en la base de datos:" -ForegroundColor Cyan
    "SELECT id, name, price, stock FROM products;" | docker exec -i mysql-products mysql -uroot -proot products_db -t
} else {
    Write-Host "Error al insertar productos" -ForegroundColor Red
}

Write-Host "`nDatos de prueba insertados!" -ForegroundColor Green
