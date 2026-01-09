# Script para insertar datos de prueba en la base de datos
# Ejecutar después de que el backend esté corriendo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSERTAR DATOS DE PRUEBA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Insertando productos de prueba..." -ForegroundColor Yellow
Write-Host ""

# Productos de ejemplo
$productos = @(
    @{
        nombre = "Laptop Dell XPS 15"
        precio = 1299.99
        stock = 15
    },
    @{
        nombre = "Teclado Mecánico Logitech"
        precio = 89.99
        stock = 50
    },
    @{
        nombre = "Mouse Inalámbrico"
        precio = 29.99
        stock = 100
    },
    @{
        nombre = "Monitor Samsung 27 pulgadas"
        precio = 349.99
        stock = 25
    },
    @{
        nombre = "Auriculares Sony WH-1000XM5"
        precio = 399.99
        stock = 30
    },
    @{
        nombre = "Webcam Logitech C920"
        precio = 79.99
        stock = 40
    },
    @{
        nombre = "Disco SSD Samsung 1TB"
        precio = 129.99
        stock = 60
    },
    @{
        nombre = "Silla Ergonómica Herman Miller"
        precio = 1499.99
        stock = 10
    },
    @{
        nombre = "Hub USB-C"
        precio = 49.99
        stock = 80
    },
    @{
        nombre = "Lámpara de Escritorio LED"
        precio = 39.99
        stock = 45
    }
)

Write-Host "Conectando a MySQL..." -ForegroundColor Gray

# Comandos SQL para insertar productos
$sqlCommands = @()

foreach ($producto in $productos) {
    $nombre = $producto.nombre
    $precio = $producto.precio
    $stock = $producto.stock
    
    $sql = "INSERT INTO products (name, price, stock, createdAt, updatedAt) VALUES ('$nombre', $precio, $stock, NOW(), NOW());"
    $sqlCommands += $sql
    
    Write-Host ("  OK: {0} - Precio: `${1} - Stock: {2}" -f $nombre, $precio, $stock) -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Comandos SQL generados:" -ForegroundColor Yellow
Write-Host ""

# Crear archivo SQL
$sqlFile = "INSERT-PRODUCTS.sql"
$sqlContent = @"
-- Datos de prueba para products_db
-- Ejecutar en MySQL

USE products_db;

-- Limpiar datos existentes (opcional)
-- DELETE FROM products;

-- Insertar productos de prueba
$($sqlCommands -join "`n")

-- Verificar productos insertados
SELECT * FROM products;

"@

$sqlContent | Out-File -FilePath $sqlFile -Encoding UTF8
Write-Host "✅ Archivo SQL creado: $sqlFile" -ForegroundColor Green
Write-Host ""

Write-Host "🔧 Opciones para insertar los datos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "OPCIÓN 1: Usando Docker (recomendado)" -ForegroundColor Cyan
Write-Host "  docker exec -i mysql-products mysql -uroot -proot products_db < $sqlFile" -ForegroundColor Gray
Write-Host ""
Write-Host "OPCIÓN 2: Manualmente en MySQL" -ForegroundColor Cyan
Write-Host "  1. docker exec -it mysql-products mysql -uroot -proot products_db" -ForegroundColor Gray
Write-Host "  2. Copiar y pegar los comandos SQL del archivo $sqlFile" -ForegroundColor Gray
Write-Host ""
Write-Host "OPCIÓN 3: Ejecutar automáticamente" -ForegroundColor Cyan
Write-Host "  Presiona ENTER para ejecutar automáticamente..." -ForegroundColor Gray

$response = Read-Host

if ($response -eq "" -or $response -eq "y" -or $response -eq "yes") {
    Write-Host ""
    Write-Host "⏳ Ejecutando comandos SQL..." -ForegroundColor Yellow
    
    try {
        # Verificar si Docker está corriendo
        $dockerRunning = docker ps 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            # Ejecutar SQL en el contenedor
            Get-Content $sqlFile | docker exec -i mysql-products mysql -uroot -proot products_db
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Productos insertados exitosamente!" -ForegroundColor Green
                Write-Host ""
                
                # Mostrar productos insertados
                Write-Host "📦 Productos en la base de datos:" -ForegroundColor Yellow
                $query = "SELECT id, name, price, stock FROM products;"
                $query | docker exec -i mysql-products mysql -uroot -proot products_db -t
            }
            else {
                Write-Host ""
                Write-Host "No se pudieron insertar productos" -ForegroundColor Red
                Write-Host "Verifica que el contenedor mysql-products este corriendo" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host ""
            Write-Host "❌ Docker no está corriendo o no se encuentra" -ForegroundColor Red
            Write-Host "   Inicia Docker Desktop primero" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host ""
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("El archivo {0} contiene todos los comandos SQL" -f $sqlFile) -ForegroundColor Gray
Write-Host ""
