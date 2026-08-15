const storage = require('./storage');

const STEP_ORDER = ['style', 'characters', 'portraits', 'chapters', 'illustrations'];
const STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Run a step
async function runStep(projectId, stepName) {
  let shouldRunGemini = false;

  // Atomic Check-then-Act using updateFn inside the mutex lock
  await storage.updateProjectDetail(projectId, (proj) => {
    if (!proj) throw new Error('Project not found');

    const stepIdx = STEP_ORDER.indexOf(stepName);
    if (stepIdx === -1) throw new Error('Invalid step');

    // Check previous step
    if (stepIdx > 0) {
      const prevStep = STEP_ORDER[stepIdx - 1];
      if (proj.steps[prevStep].status !== 'done') {
        throw new Error(`Cannot run ${stepName} before ${prevStep} is done`);
      }
    }

    // Idempotency / Stuck state check
    const currentStepState = proj.steps[stepName];
    if (currentStepState.status === 'in_progress') {
      const startedAt = currentStepState.startedAt || 0;
      if (Date.now() - startedAt < STUCK_TIMEOUT_MS) {
        // It's genuinely in progress, block duplicate call
        throw new Error('Step is currently in progress. Please wait.');
      }
      // Else: It's stuck (timeout exceeded), allow retry
      console.log(`Step ${stepName} was stuck. Retrying...`);
    } else if (currentStepState.status === 'done') {
       throw new Error('Step is already done');
    }

    // Update state to in_progress
    proj.steps[stepName] = {
      ...proj.steps[stepName],
      status: 'in_progress',
      startedAt: Date.now()
    };
    proj.status = 'In progress'; // Overall status
    shouldRunGemini = true;
    return proj;
  });

  await storage.updateProjectStatus(projectId, 'In progress');

  // Trigger the async worker outside the lock
  if (shouldRunGemini) {
    executeGeminiStepAsync(projectId, stepName).catch(err => console.error(err));
  }

  return { message: 'Step started', status: 'in_progress' };
}

async function executeGeminiStepAsync(projectId, stepName) {
  try {
    // 1. Get project text/context
    const project = await storage.getProjectDetail(projectId);
    
    // 2. Call Gemini API Wrapper (stubbed for now)
    const geminiService = require('./geminiClient');
    const result = await geminiService.callStep(projectId, stepName, project);

    // 3. Mark done
    await storage.updateProjectDetail(projectId, (proj) => {
      proj.steps[stepName].status = 'done';
      proj.steps[stepName].result = result;
      proj.steps[stepName].finishedAt = Date.now();
      
      // Update overall status if this was the last step
      if (stepName === STEP_ORDER[STEP_ORDER.length - 1]) {
         proj.status = 'Done';
      }
      return proj;
    });
    
    if (stepName === STEP_ORDER[STEP_ORDER.length - 1]) {
       await storage.updateProjectStatus(projectId, 'Done');
    }
    
  } catch (error) {
    console.error(`Step ${stepName} failed:`, error);
    // Mark failed
    await storage.updateProjectDetail(projectId, (proj) => {
      proj.steps[stepName].status = 'failed';
      proj.steps[stepName].error = error.message;
      return proj;
    });
  }
}

module.exports = {
  runStep,
  STEP_ORDER
};
