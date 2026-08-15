@echo off
echo Running backend tests...
node backend/test.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running frontend tests...
cd frontend
npm run test
