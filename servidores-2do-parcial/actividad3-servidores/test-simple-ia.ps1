# Test simple de IA
Write-Host "Consultando IA..." -ForegroundColor Cyan

$body = @{
    message = "Que productos tienen disponibles?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:4000/ai/ask" -Method Post `
    -Headers @{"Content-Type"="application/json"} -Body $body

Write-Host ""
Write-Host "Respuesta de Gemini:" -ForegroundColor Green
Write-Host $response.response -ForegroundColor White
Write-Host ""
Write-Host "Herramientas ejecutadas:" -ForegroundColor Yellow
$response.toolCalls | ForEach-Object {
    Write-Host "  - $($_.tool)" -ForegroundColor Cyan
}
