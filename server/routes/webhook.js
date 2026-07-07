const express = require('express')
const router = express.Router()
const RepoConfig = require('../models/RepoConfig')
const Issue = require('../models/Issue')
const { verifySignature, extractIssueData } = require('../services/webhookService')

// POST /api/webhook/github
router.post('/github', async (req, res) => {
  const signatureHeader = req.headers['x-hub-signature-256']
  const rawBody = req.rawBody || ''

  // Find the config whose webhookSecret matches this payload signature.
  // We try all configs since GitHub doesn't send the sessionId.
  const configs = await RepoConfig.find()
  let matchedConfig = null
  for (const cfg of configs) {
    if (verifySignature(cfg.webhookSecret, rawBody, signatureHeader)) {
      matchedConfig = cfg
      break
    }
  }

  if (!matchedConfig) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const payload = req.body
  if (payload.action !== 'opened') {
    return res.status(200).json({ message: 'Event ignored' })
  }

  const issueData = extractIssueData(payload)

  try {
    const issue = await Issue.create({
      sessionId:      matchedConfig.sessionId,
      githubIssueId:  payload.issue.id,
      githubIssueUrl: payload.issue.html_url,
      repoName:       issueData.repoName,
      title:          issueData.title,
      body:           issueData.body,
      labels:         issueData.labels,
      userLogin:      issueData.userLogin,
      analysisStatus: 'pending'
    })
    res.status(200).json({ message: 'Webhook received', issueId: issue._id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save issue' })
  }
})

module.exports = router
