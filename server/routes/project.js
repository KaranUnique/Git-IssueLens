const express = require('express')
const router = express.Router()
const Project = require('../models/Project')

// GET /api/project
router.get('/', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })
  try {
    const project = await Project.findOne({ sessionId })
    if (!project) return res.status(404).json({ error: 'No project configured yet' })
    res.json(project)
  } catch {
    res.status(500).json({ error: 'Failed to retrieve project' })
  }
})

// POST /api/project
router.post('/', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })

  const { name, description, scope, technologies } = req.body
  const errors = {}
  if (!name || name.trim() === '')               errors.name = 'Project name is required'
  if (!description || description.trim() === '') errors.description = 'Project description is required'
  if (!scope || scope.trim() === '')             errors.scope = 'Project scope is required'
  if (!technologies || technologies.trim() === '') errors.technologies = 'Technologies used is required'
  if (Object.keys(errors).length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors })

  try {
    const project = await Project.findOneAndUpdate(
      { sessionId },
      { sessionId, name: name.trim(), description: description.trim(), scope: scope.trim(), technologies: technologies.trim() },
      { upsert: true, new: true, runValidators: true }
    )
    res.json(project)
  } catch {
    res.status(500).json({ error: 'Failed to save project' })
  }
})

module.exports = router
