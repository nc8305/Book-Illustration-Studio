const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

// Get all projects for a user
router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'default_user';
  const projects = await storage.getUserProjects(userId);
  res.json(projects);
});

// Get a single project details
router.get('/:id', async (req, res) => {
  const project = await storage.getProjectDetail(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// Create a new project
router.post('/', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'default_user';
  const { title, bookText } = req.body;
  if (!title || !bookText) return res.status(400).json({ error: 'Missing title or bookText' });

  const projectId = 'proj_' + Date.now();
  
  const newProject = {
    id: projectId,
    userId,
    title,
    bookText, // The full text of the book
    createdAt: Date.now(),
    status: 'Draft',
    steps: {
      style: { status: 'pending' },
      characters: { status: 'pending' },
      portraits: { status: 'pending' },
      chapters: { status: 'pending' },
      illustrations: { status: 'pending' }
    }
  };

  await storage.createProject(newProject);
  res.status(201).json(newProject);
});

module.exports = router;
