const express = require('express')
const router = express.Router()
const Issue = require('../models/Issue')
const RepoConfig = require('../models/RepoConfig')
const { analyzeIssue } = require('../services/geminiService')

// GET /api/issues
router.get('/', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })
  try {
    const issues = await Issue.find({ sessionId }).sort({ createdAt: -1 })
    res.json(issues)
  } catch {
    res.status(500).json({ error: 'Failed to retrieve issues' })
  }
})

// PATCH /api/issues/:id/decision
router.patch('/:id/decision', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })
  const { decision } = req.body
  if (!['Accepted', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be "Accepted" or "Rejected"' })
  }
  try {
    const issue = await Issue.findOneAndUpdate(
      { _id: req.params.id, sessionId },
      { maintainerDecision: decision },
      { new: true }
    )
    if (!issue) return res.status(404).json({ error: 'Issue not found' })
    res.json(issue)
  } catch {
    res.status(500).json({ error: 'Failed to update decision' })
  }
})

// POST /api/issues/reset-status
router.post('/reset-status', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })
  try {
    const result = await Issue.updateMany(
      { sessionId, analysisStatus: 'error' },
      { $set: { analysisStatus: 'pending' } }
    )
    res.json({ message: `Reset ${result.modifiedCount} issue(s) to pending` })
  } catch {
    res.status(500).json({ error: 'Failed to reset status' })
  }
})

// POST /api/issues/:id/analyze
router.post('/:id/analyze', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })

  const config = await RepoConfig.findOne({ sessionId })
  if (!config) return res.status(400).json({ error: 'No repository configured' })

  const issue = await Issue.findOne({ _id: req.params.id, sessionId })
  if (!issue) return res.status(404).json({ error: 'Issue not found' })

  await Issue.findByIdAndUpdate(issue._id, { analysisStatus: 'pending' })

  try {
    const analysis = await analyzeIssue(config, {
      title: issue.title, body: issue.body, labels: issue.labels,
      userLogin: issue.userLogin, repoName: issue.repoName,
      repoDescription: config.repoDescription || ''
    })
    if (analysis.error) {
      await Issue.findByIdAndUpdate(issue._id, { analysisStatus: 'error' })
      return res.status(502).json({ error: analysis.error })
    }
    const updated = await Issue.findByIdAndUpdate(
      issue._id,
      { ...analysis.data, analysisStatus: 'complete' },
      { new: true }
    )
    res.json(updated)
  } catch (err) {
    await Issue.findByIdAndUpdate(issue._id, { analysisStatus: 'error' })
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
