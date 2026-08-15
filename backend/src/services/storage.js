const fs = require('fs/promises');
const path = require('path');
const { Mutex } = require('async-mutex');

const DATA_DIR = path.join(__dirname, '../../data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const mutexes = new Map();

// Helper to get a mutex for a specific file (project) to ensure write lock
function getMutex(id) {
  if (!mutexes.has(id)) {
    mutexes.set(id, new Mutex());
  }
  return mutexes.get(id);
}

// Initialize data directory
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(PROJECTS_FILE);
    } catch {
      await fs.writeFile(PROJECTS_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
}

// Get all projects for a user
async function getUserProjects(userId) {
  const mutex = getMutex('projects_list');
  return await mutex.runExclusive(async () => {
    try {
      const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
      const projects = JSON.parse(data);
      return projects.filter(p => p.userId === userId);
    } catch {
      return [];
    }
  });
}

// Get project summary by id
async function getProject(projectId) {
  const mutex = getMutex('projects_list');
  return await mutex.runExclusive(async () => {
    try {
      const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
      const projects = JSON.parse(data);
      return projects.find(p => p.id === projectId);
    } catch {
      return null;
    }
  });
}

// Create a new project
async function createProject(project) {
  const mutex = getMutex('projects_list');
  await mutex.runExclusive(async () => {
    let projects = [];
    try {
      const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
      projects = JSON.parse(data);
    } catch {}
    projects.push({ id: project.id, userId: project.userId, title: project.title, createdAt: project.createdAt, status: project.status });
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
  });

  // Create project detail file
  const projectMutex = getMutex(`project_${project.id}`);
  await projectMutex.runExclusive(async () => {
    await fs.writeFile(path.join(DATA_DIR, `${project.id}.json`), JSON.stringify(project, null, 2));
  });
}

// Get full project detail
async function getProjectDetail(projectId) {
  const mutex = getMutex(`project_${projectId}`);
  return await mutex.runExclusive(async () => {
    try {
      const data = await fs.readFile(path.join(DATA_DIR, `${projectId}.json`), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  });
}

// Update project detail
async function updateProjectDetail(projectId, updateFn) {
  const mutex = getMutex(`project_${projectId}`);
  return await mutex.runExclusive(async () => {
    try {
      const filePath = path.join(DATA_DIR, `${projectId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const project = JSON.parse(data);
      
      const updatedProject = updateFn(project);
      
      await fs.writeFile(filePath, JSON.stringify(updatedProject, null, 2));
      return updatedProject;
    } catch (err) {
      console.error(`Failed to update project ${projectId}:`, err);
      throw err;
    }
  });
}

// Update project status in list
async function updateProjectStatus(projectId, status) {
  const mutex = getMutex('projects_list');
  await mutex.runExclusive(async () => {
    try {
      const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
      const projects = JSON.parse(data);
      const idx = projects.findIndex(p => p.id === projectId);
      if (idx !== -1) {
        projects[idx].status = status;
        await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
      }
    } catch (err) {
      console.error('Failed to update project list status:', err);
    }
  });
}

module.exports = {
  initStorage,
  getUserProjects,
  getProject,
  createProject,
  getProjectDetail,
  updateProjectDetail,
  updateProjectStatus
};
