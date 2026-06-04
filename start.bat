@echo off
echo Starting EventMind backend services...

set ROOT=%~dp0
set PYTHONPATH=%ROOT%
set DATABASE_URL=sqlite:///platform_dev.db
set JWT_SECRET=REPLACE_WITH_YOUR_JWT_SECRET
set MOCK_KAFKA=TRUE
set REDIS_HOST=MOCK
set STRIPE_SECRET_KEY=REPLACE_WITH_YOUR_STRIPE_SECRET_KEY
set STRIPE_PUBLISHABLE_KEY=REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY
set STRIPE_WEBHOOK_SECRET=REPLACE_WITH_YOUR_STRIPE_WEBHOOK_SECRET
set OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_API_KEY
set TICKETMASTER_API_KEY=REPLACE_WITH_YOUR_TICKETMASTER_API_KEY

start "Auth"           cmd /k "cd /d %ROOT%backend\services\auth           && python -m uvicorn main:app --port 8001 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "User"           cmd /k "cd /d %ROOT%backend\services\user           && python -m uvicorn main:app --port 8002 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "Event"          cmd /k "cd /d %ROOT%backend\services\event          && python -m uvicorn main:app --port 8003 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "Ticketing"      cmd /k "cd /d %ROOT%backend\services\ticketing      && python -m uvicorn main:app --port 8004 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "Payment"        cmd /k "cd /d %ROOT%backend\services\payment        && python -m uvicorn main:app --port 8005 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "Notification"   cmd /k "cd /d %ROOT%backend\services\notification   && python -m uvicorn main:app --port 8006 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "Chat"           cmd /k "cd /d %ROOT%backend\services\chat           && python -m uvicorn main:app --port 8007 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "Recommendation" cmd /k "cd /d %ROOT%backend\services\recommendation && python -m uvicorn main:app --port 8008 --host 127.0.0.1"
timeout /t 2 /nobreak >nul
start "Review"         cmd /k "cd /d %ROOT%backend\services\review         && python -m uvicorn main:app --port 8009 --host 127.0.0.1"
timeout /t 5 /nobreak >nul
start "Gateway"        cmd /k "cd /d %ROOT%backend\gateway                 && python -m uvicorn main:app --port 8000 --host 127.0.0.1"

echo.
echo All services started. Open http://localhost:3000 for the frontend.
echo Run: cd frontend_react ^&^& pnpm --filter @eventmind/web dev
pause
