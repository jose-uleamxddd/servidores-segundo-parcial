# Script para verificar el estado del sistema

Write-Host "`n=== VERIFICACIÓN DEL SISTEMA ===" -ForegroundColor Cyan

# Verificar Docker
Write-Host "`n1. Contenedores Docker:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verificar puertos
Write-Host "`n2. Puertos en uso:" -ForegroundColor Yellow
Write-Host "Puerto 3000 (API Gateway):"
netstat -an | Select-String ":3000" | Select-Object -First 3

Write-Host "`nPuerto 5672 (RabbitMQ):"
netstat -an | Select-String ":5672" | Select-Object -First 3

Write-Host "`nPuerto 3306 (MySQL Products):"
netstat -an | Select-String ":3306" | Select-Object -First 3

Write-Host "`nPuerto 3307 (MySQL Orders):"
netstat -an | Select-String ":3307" | Select-Object -First 3

# Verificar bases de datos
Write-Host "`n3. Productos en la base de datos:" -ForegroundColor Yellow
docker exec mysql-products mysql -uroot -proot products_db -e "SELECT * FROM products;" 2>$null

Write-Host "`n4. Pedidos en la base de datos:" -ForegroundColor Yellow
docker exec mysql-orders mysql -uroot -proot orders_db -e "SELECT * FROM orders;" 2>$null

Write-Host "`n=== FIN DE VERIFICACIÓN ===" -ForegroundColor Cyan
