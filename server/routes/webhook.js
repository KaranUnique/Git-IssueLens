const express = require('express')
const router = express.Router()
const RepoConfig = require('../models/RepoConfig')
const Issue = require('../models/Issue')
const { verifySignature, extractIssueData } = require('../services/webhookService')

// POST /api/webhook/github — receive and process GitHub issue events
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
router.post('/github', async (req, res) => {
  const config = await RepoConfig.findOne()

  const signatureHeader = req.headers['x-hub-signature-256']
  const secret = config ? config.webhookSecret : ''
  const rawBody = req.rawBody || ''

  if (!verifySignature(secret, rawBody, signatureHeader)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const payload = req.body

  if (payload.action !== 'opened') {
    return res.status(200).json({ message: 'Event ignored' })
  }

  const issueData = extractIssueData(payload)

  try {
    const issue = await Issue.create({
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
