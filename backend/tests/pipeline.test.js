const test = require('node:test');
const assert = require('node:assert');
const storage = require('../src/services/storage');
const pipeline = require('../src/services/pipeline');

test('Backend Logic - Pipeline state machine and step ordering', async (t) => {
  // Setup: Mock storage
  const mockProject = {
    id: 'test_proj',
    status: 'Draft',
    steps: {
      style: { status: 'pending' },
      characters: { status: 'pending' }
    }
  };

  await t.test('Should prevent running step 2 if step 1 is not done', async () => {
    storage.updateProjectDetail = async (id, fn) => fn(mockProject);
    
    try {
      await pipeline.runStep('test_proj', 'characters');
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.strictEqual(err.message, 'Cannot run characters before style is done');
    }
  });

  await t.test('Should block duplicate calls (Idempotency) when step is in_progress', async () => {
    const inProgressProject = {
      ...mockProject,
      steps: {
        style: { status: 'in_progress', startedAt: Date.now() }
      }
    };
    storage.updateProjectDetail = async (id, fn) => fn(inProgressProject);

    try {
      await pipeline.runStep('test_proj', 'style');
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.strictEqual(err.message, 'Step is currently in progress. Please wait.');
    }
  });

  await t.test('Should allow stuck state recovery if timeout exceeded', async () => {
    const stuckProject = {
      ...mockProject,
      steps: {
        style: { status: 'in_progress', startedAt: Date.now() - (10 * 60 * 1000) }
      }
    };
    storage.updateProjectDetail = async (id, fn) => fn(stuckProject);
    storage.updateProjectStatus = async () => {};
    
    try {
      // Since we don't mock geminiClient here, runStep will trigger the async Gemini call and return success
      const result = await pipeline.runStep('test_proj', 'style');
      assert.strictEqual(result.status, 'in_progress');
    } catch (err) {
      // It shouldn't throw the 'currently in progress' error!
      assert.fail('Should have allowed retry for stuck state: ' + err.message);
    }
  });
});
