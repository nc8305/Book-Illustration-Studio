const express = require('express');
const router = express.Router();
const pipeline = require('../services/pipeline');

// Trigger a step
router.post('/:projectId/steps/:stepName/run', async (req, res) => {
  const { projectId, stepName } = req.params;
  
  try {
    const result = await pipeline.runStep(projectId, stepName);
    res.json(result);
  } catch (error) {
    if (error.message === 'Step is currently in progress. Please wait.') {
      return res.status(409).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
