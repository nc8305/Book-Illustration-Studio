require('dotenv').config();
const express = require('express');
const cors = require('cors');
const storage = require('./src/services/storage');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
const projectsRouter = require('./src/routes/projects');
const stepsRouter = require('./src/routes/steps');

app.use('/api/projects', projectsRouter);
app.use('/api/projects', stepsRouter);

// Init and start
async function start() {
  await storage.initStorage();
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

start();
