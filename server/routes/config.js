const express = require('express')
const router = express.Router()
const RepoConfig = require('../models/RepoConfig')
const Issue = require('../models/Issue')
const { parseRepoUrl, registerWebhook, deregisterWebhook, fetchOpenIssues } = require('../services/githubService')

async function fetchRepoDescription(repoOwner, repoName, pat) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.description || ''
  } catch { return '' }
}

async function fetchReadmeContent(repoOwner, repoName, pat) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/readme`, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.raw+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    if (!res.ok) return ''
    const text = await res.text()
    return text.slice(0, 6000)
  } catch { return '' }
}

// GET /api/config
router.get('/', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })
  try {
    const config = await RepoConfig.findOne({ sessionId })
    if (!config) return res.status(404).json({ error: 'No repository configured yet' })
    res.json({
      repoUrl:         config.repoUrl,
      repoOwner:       config.repoOwner,
      repoName:        config.repoName,
      repoDescription: config.repoDescription || ''
    })
  } catch {
    res.status(500).json({ error: 'Failed to retrieve configuration' })
  }
})

// POST /api/config
router.post('/', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })

  const { repoUrl, pat, webhookSecret } = req.body
  const errors = {}
  if (!repoUrl || repoUrl.trim() === '')             errors.repoUrl = 'Repository URL is required'
  if (!pat || pat.trim() === '')                     errors.pat = 'GitHub Personal Access Token is required'
  if (!webhookSecret || webhookSecret.trim() === '') errors.webhookSecret = 'Webhook Secret is required'
  if (Object.keys(errors).length > 0) return res.status(400).json({ error: 'Validation failed', fields: errors })

  let repoOwner, repoName
  try {
    ;({ repoOwner, repoName } = parseRepoUrl(repoUrl.trim()))
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const existing = await RepoConfig.findOne({ sessionId })
  if (existing && existing.webhookId) {
    try {
      await deregisterWebhook(existing.repoOwner, existing.repoName, existing.pat, existing.webhookId)
    } catch (err) {
      console.warn('Failed to deregister previous webhook:', err.message)
    }
  }

  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || ''
  const webhookUrl = `${webhookBaseUrl}/api/webhook/github`

  let webhookId
  try {
    webhookId = await registerWebhook(repoOwner, repoName, pat.trim(), webhookUrl, webhookSecret.trim())
  } catch (err) {
    return res.status(502).json({ error: `GitHub API webhook registration failed: ${err.message}` })
  }

  const [repoDescription, readmeContent] = await Promise.all([
    fetchRepoDescription(repoOwner, repoName, pat.trim()),
    fetchReadmeContent(repoOwner, repoName, pat.trim())
  ])

  try {
    await RepoConfig.findOneAndUpdate(
      { sessionId },
      { sessionId, repoUrl: repoUrl.trim(), repoOwner, repoName, repoDescription, readmeContent, pat: pat.trim(), webhookSecret: webhookSecret.trim(), webhookId },
      { upsert: true, new: true, runValidators: true }
    )
  } catch {
    return res.status(500).json({ error: 'Failed to save configuration' })
  }

  res.json({ message: 'Repository configured successfully', repoUrl: repoUrl.trim() })

  syncExistingIssues({ sessionId, repoOwner, repoName, repoDescription, pat: pat.trim() }).catch(err =>
    console.warn('Failed to sync existing issues:', err.message)
  )
})

// DELETE /api/config — deregister webhook and remove all session data
router.delete('/', async (req, res) => {
  const { sessionId } = req
  if (!sessionId) return res.status(400).json({ error: 'Missing session' })

  const config = await RepoConfig.findOne({ sessionId })
  if (config && config.webhookId) {
    try {
      await deregisterWebhook(config.repoOwner, config.repoName, config.pat, config.webhookId)
    } catch (err) {
      console.warn('Failed to deregister webhook on disconnect:', err.message)
    }
  }

  await RepoConfig.deleteOne({ sessionId })
  await Issue.deleteMany({ sessionId })

  res.json({ message: 'Repository disconnected' })
})

async function syncExistingIssues({ sessionId, repoOwner, repoName, repoDescription, pat }) {
  let githubIssues
  try {
    githubIssues = await fetchOpenIssues(repoOwner, repoName, pat)
  } catch (err) {
    console.warn('fetchOpenIssues failed:', err.message)
    return
  }

  for (const ghIssue of githubIssues) {
    const exists = await Issue.findOne({ sessionId, githubIssueId: ghIssue.id })
    if (exists) continue
    try {
      await Issue.create({
        sessionId,
        githubIssueId:  ghIssue.id,
        githubIssueUrl: ghIssue.html_url,
        repoName,
        title:          ghIssue.title || '',
        body:           ghIssue.body || '',
        labels:         (ghIssue.labels || []).map(l => l.name).filter(Boolean),
        userLogin:      ghIssue.user?.login || '',
        analysisStatus: 'pending'
      })
    } catch (err) {
      console.warn(`Failed to save issue #${ghIssue.number}:`, err.message)
    }
  }
  console.log(`Synced ${githubIssues.length} issue(s) from GitHub for session ${sessionId}`)
}

module.exports = router
