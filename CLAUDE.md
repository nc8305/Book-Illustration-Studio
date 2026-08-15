# AI Copilot Context and Instructions

This file serves as the core context for the AI assistant (Claude/Cursor/Copilot) working on the Book Illustration Studio project.

## Project Rules
- Follow `gradion-assessment-intern-software-engineer.md` strictly.
- **Do not over-engineer.** Avoid databases if local file storage with a mutex works.
- **Idempotency is critical:** Block duplicate requests on the server-side via `409 Conflict`.
- **Cost Discipline:** Extract characters (max 2) and chapters (max 1), and chain Gemini API context using `previous_interaction_id`.
- **UI:** No Tailwind CSS unless strictly required. Use Vanilla CSS with modern glassmorphism.

## Current Architecture
- `backend/`: Node.js, Express, `@google/genai`.
- `frontend/`: React, Vite, Vanilla CSS.
- `data/`: Local JSON storage for project states.
