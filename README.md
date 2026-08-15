# Book Illustration Studio

A web application that turns a book's text into character portraits and a chapter illustration using the Gemini API.

## Prerequisites
- Node.js (v18+)
- A Gemini API Key

## Environment Setup
1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your Gemini API key to the `.env` file.

## Running the Application
To start both the backend and frontend simultaneously, run:
```bash
bash start.sh
```
- The frontend will be available at `http://localhost:5173`
- The backend will run on `http://localhost:3001`

## Running Tests
To run the automated tests for both the backend (state machine logic) and frontend (React components), run:
```bash
bash test.sh
```

## Architecture Overview
- **Backend**: Node.js + Express. Serves as the State Machine controller and the sole wrapper for the Gemini API. Uses a local JSON file store with an in-memory `async-mutex` lock to prevent race conditions during concurrent reads/writes.
- **Frontend**: React (Vite). A Single Page Application using vanilla CSS and glassmorphism UI. Polls the backend for state updates.
- **AI Tooling**: Built with AI pairing. See `DECISIONS.md` for engineering trade-offs and AI overrides, and `docs/plan.md` for the initial implementation plan.
