@echo off
echo Stopping all EventMind backend services...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'uvicorn' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
for %%T in (Auth Community User Event Ticketing Payment Notification Chat Recommendation Review Gateway) do taskkill /FI "WINDOWTITLE eq %%T" /T /F >nul 2>&1
echo Done. All EventMind backend services stopped.
timeout /t 2 /nobreak >nul
