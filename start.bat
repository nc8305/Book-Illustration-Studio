@echo off
npm install && cd frontend && npm install && cd ..
start cmd /k "npm start"
cd frontend
npm run dev
