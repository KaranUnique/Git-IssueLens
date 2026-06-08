const express = require('express')
const router = express.Router()
const Issue = require('../models/Issue')
const RepoConfig = require('../models/RepoConfig')
const { analyzeIssue } = require('../services/geminiService')

// GET /api/issues — return all issues sorted by createdAt desc
// Requirements: 4.1, 7.4
router.get('/', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 })
    res.json(issues)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve issues' })
  }
})

// PATCH /api/issues/:id/decision — update maintainerDecision
// Requirements: 5.2, 5.3, 7.5
router.patch('/:id/decision', async (req, res) => {
  const { decision } = req.body

  if (!['Accepted', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be "Accepted" or "Rejected"' })
  }

  try {
    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { maintainerDecision: decision },
      { new: true }
    )
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' })
    }
    res.json(issue)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update decision' })
  }
})

// POST /api/issues/reset-status — reset all error issues back to pending
router.post('/reset-status', async (req, res) => {
  try {
    const result = await Issue.updateMany(
      { analysisStatus: 'error' },
      { $set: { analysisStatus: 'pending' } }
    )
    res.json({ message: `Reset ${result.modifiedCount} issue(s) to pending` })
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset status' })
  }
})

// POST /api/issues/:id/analyze — run Gemini analysis on a single issue
router.post('/:id/analyze', async (req, res) => {
  const config = await RepoConfig.findOne()
  if (!config) {
    return res.status(400).json({ error: 'No repository configured' })
  }

  const issue = await Issue.findById(req.params.id)
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' })
  }

  await Issue.findByIdAndUpdate(issue._id, { analysisStatus: 'pending' })

  const issueData = {
    title:           issue.title,
    body:            issue.body,
    labels:          issue.labels,
    userLogin:       issue.userLogin,
    repoName:        issue.repoName,
    repoDescription: config.repoDescription || ''
  }

  try {
    const analysis = await analyzeIssue(config, issueData)
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

// POST /api/issues/reanalyze — retry Gemini analysis for all error/pending issues
router.post('/reanalyze', async (req, res) => {
  const config = await RepoConfig.findOne()
  if (!config) {
    return res.status(400).json({ error: 'No repository configured' })
  }

  const failedIssues = await Issue.find({ analysisStatus: { $in: ['error', 'pending'] } })
  res.json({ message: `Re-analyzing ${failedIssues.length} issue(s) in the background` })

  // Free tier: 15 requests/min. Use 5s delay between requests to stay safe.
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  for (const issue of failedIssues) {
    const issueData = {
      title:           issue.title,
      body:            issue.body,
      labels:          issue.labels,
      userLogin:       issue.userLogin,
      repoName:        issue.repoName,
      repoDescription: config.repoDescription || ''
    }
    try {
      await Issue.findByIdAndUpdate(issue._id, { analysisStatus: 'pending' })
      const analysis = await analyzeIssue(config, issueData)
      if (analysis.error) {
        console.error(`Re-analyze failed for "${issue.title}": ${analysis.error}`)
        await Issue.findByIdAndUpdate(issue._id, { analysisStatus: 'error' })
      } else {
        await Issue.findByIdAndUpdate(issue._id, { ...analysis.data, analysisStatus: 'complete' })
        console.log(`Re-analyzed: "${issue.title}"`)
      }
    } catch (err) {
      console.error(`Re-analyze exception for "${issue.title}": ${err.message}`)
      await Issue.findByIdAndUpdate(issue._id, { analysisStatus: 'error' })
    }
    // Throttle to avoid hitting the free tier rate limit (15 req/min)
    await delay(5000)
  }
  console.log('Re-analyze complete')
})

module.exports = router
