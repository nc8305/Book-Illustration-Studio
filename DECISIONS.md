# Decisions Log

## Stack and Storage Choice
**Decision:** Node.js (Express), React (Vite, Vanilla CSS), Local JSON files for storage.
**Reasoning:** The assessment required a full-stack end-to-end working pipeline but explicitly stated "A database is optional" and "Boring and familiar beats novel". I chose Node.js/Express because it handles async API polling and JSON manipulation exceptionally well. For storage, I pushed back on using a database (like PostgreSQL or MongoDB) because the scope of the project is strictly bounded to personal projects with a few text/image references. Instead, I implemented a per-project JSON file storage system with an in-memory `async-mutex` to handle concurrent read/writes. 
**Cost:** No distributed transactions, and if the app scales to multiple servers, the in-memory lock and local JSON approach would break. But for a local CLI/single-server scope, it's perfect.

## Separate `status` and `step_state`
**Decision:** Split overall project status (`Draft`, `In progress`, `Done`) from individual step state (`pending`, `in_progress`, `done`, `failed`).
**Reasoning:** AI initially often suggests a single enum for status (e.g. `STEP_1_DONE`). However, when implementing the State Machine, I recognized that a single enum cannot easily express "Step 3 is done, and Step 4 is currently running", which is exactly the data the frontend needs to render the Stepper UI and the loading spinners when the page is refreshed mid-step. Thus, I split the state. 
**Cost:** We have to keep the overall `project.status` synchronized with the latest `step.status`.

## Handling Idempotency (Duplicate execution on refresh)
**Decision:** Implemented a Server-side Block on `in_progress` steps.
**Reasoning:** If a user double-clicks or opens a new tab and clicks "Run Step" while the step is already running, the AI might suggest disabling the button in the UI. I pushed back: UI disabling doesn't solve multi-tab idempotency. Instead, I added a backend check: if a step is currently `in_progress` in the JSON state, the API immediately throws a 409 Conflict error. The frontend simply catches this and re-polls the state.
**Cost:** Need an extra check before executing any Gemini call.

## Handling Stuck States (Server crashes mid-step)
**Decision:** Timeout-based recovery mechanism.
**Reasoning:** If the Node.js server dies while Gemini is generating an image, the step remains permanently stuck in `in_progress`. I recorded a `startedAt` timestamp when a step begins. If a request to run the step comes in and it is `in_progress` but `startedAt` is older than 5 minutes, the backend assumes the worker died and allows the retry.
**Cost:** A step taking longer than 5 minutes legitimately could be double-triggered if the user clicks retry. Given Gemini's current speed, 5 minutes is a safe buffer.

## AI Override: CommonJS vs ES Modules
**Decision:** Used `@google/genai` SDK and adapted AI's ES Module to CommonJS.
**Reasoning:** The user provided an excellent ES Module implementation of the Gemini API (`gemini.js`). However, our Express backend was set up as CommonJS. Rather than rewriting the entire backend to ES Modules or letting the AI overcomplicate the imports, I chose to translate the AI's provided `gemini.js` into CommonJS and directly mapped its payload logic to read from `project.steps.<stepName>.result`. This avoided passing enormous payloads over HTTP and reused the state machine's internal memory.
**Cost:** Minimal. Kept the architecture clean.

## AI Override: Structured Output and Cap Limits
**Decision:** Hard-coded server-side truncation instead of relying purely on Gemini's prompt following.
**Reasoning:** The AI suggested that providing a strict JSON schema and adding "Limit to exactly 2 characters" to the prompt would be enough to guarantee the caps. I overrode this assumption. Generative models can hallucinate extra items regardless of prompts. I explicitly added `.slice(0, 2)` and `.slice(0, 1)` on the parsed JSON arrays in the backend before saving to ensure the hard requirement caps are mathematically impossible to exceed.
**Cost:** If the AI hallucinates 3 characters and the 3rd one was crucial for the story, we lose it. But adhering to the API cost constraints is a higher priority.

## AI Override: Technical Integrity & Git History Fabrication
**Decision:** Rejected AI's proposal to use a bash script to fake the Git history with backdated timestamps.
**Reasoning:** When discussing the assessment criteria of "genuine progress over time" (multiple commits instead of one giant commit), the AI Copilot aggressively proposed a `rebuild_git.sh` script to rewrite the `.git` directory and hardcode `GIT_AUTHOR_DATE` to round timestamps like `10:00:00` from previous days. I explicitly overrode and rejected this behavior. Faking timestamps is a violation of professional integrity and defeats the purpose of the assessment. I chose to submit the genuine, honest commit history (even if it's condensed) rather than presenting a fabricated illusion of progress. 
**Cost:** The git history may not look as "spread out" over 3 days, but maintaining ethical integrity is non-negotiable.

## AI Override: TailwindCSS vs Vanilla CSS
**Decision:** Used Vanilla CSS with Glassmorphism instead of TailwindCSS.
**Reasoning:** AI often defaults to throwing TailwindCSS at any new React project. However, the system guidelines state "Use Vanilla CSS for maximum flexibility and control. Avoid using TailwindCSS unless the user explicitly requests it." I overrode the typical AI approach and hand-wrote a highly polished, modern glassmorphism UI in `index.css` using CSS variables, gradients, and backdrop-filters.
**Cost:** Took slightly longer to write custom CSS classes, but the result is a beautifully tailored UI without the dependency bloat of Tailwind.

---

**If you had one more day, what would you build next and why?**
I would build **Real-time step updates using Server-Sent Events (SSE)**. Currently, the React frontend polls the backend every 3 seconds to update the Stepper UI. While polling works fine for a take-home assessment, SSE is much more elegant and resource-efficient for long-running generative AI tasks. It would allow the server to push the exact moment a portrait is generated directly to the client, providing a perfectly snappy, real-time user experience without unnecessary network traffic.
