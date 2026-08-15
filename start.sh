#!/bin/bash
# Install backend dependencies if not exist
npm install
# Install frontend dependencies if not exist
cd frontend
npm install
cd ..

# Start backend in background and frontend
npm run start &
cd frontend
npm run dev
