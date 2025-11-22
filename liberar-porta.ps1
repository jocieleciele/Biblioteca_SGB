# Script para liberar a porta 4000
# Uso: .\liberar-porta.ps1

$port = 4000
Write-Host "Procurando processos usando a porta $port..." -ForegroundColor Yellow

$connections = netstat -ano | Select-String ":$port.*LISTENING"

if ($connections) {
    $pids = $connections | ForEach-Object {
        if ($_ -match '\s+(\d+)$') {
            $matches[1]
        }
    } | Select-Object -Unique
    
    foreach ($pid in $pids) {
        Write-Host "Encerrando processo PID: $pid" -ForegroundColor Red
        taskkill /PID $pid /F 2>&1 | Out-Null
    }
    
    Start-Sleep -Seconds 2
    
    $check = netstat -ano | Select-String ":$port.*LISTENING"
    if ($check) {
        Write-Host "Ainda há processos usando a porta $port" -ForegroundColor Red
    } else {
        Write-Host "Porta $port liberada com sucesso!" -ForegroundColor Green
    }
} else {
    Write-Host "Nenhum processo encontrado usando a porta $port" -ForegroundColor Green
}

