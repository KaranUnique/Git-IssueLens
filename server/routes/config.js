const express = require('express')
const router = express.Router()
const RepoConfig = require('../models/RepoConfig')
const Issue = require('../models/Issue')
const { parseRepoUrl, registerWebhook, deregisterWebhook, fetchOpenIssues } = require('../services/githubService')

// Helper: fetch repo description from GitHub API
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
  } catch {
    return ''
  }
}

// Helper: fetch README content from GitHub API (raw text, truncated to 6000 chars)
async function fetchReadmeContent(repoOwner, repoName, pat) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/readme`, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.raw+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    if (!res.ok) {
      console.warn(`[Config] README not found for ${repoOwner}/${repoName} (${res.status})`)
      return ''
    }
    const text = await res.text()
    // Truncate to 6000 chars to keep prompt size manageable
    return text.slice(0, 6000)
  } catch (err) {
    console.warn(`[Config] Failed to fetch README: ${err.message}`)
    return ''
  }
}

// GET /api/config — return current config (repoUrl only; omit pat and webhookSecret)
router.get('/', async (req, res) => {
  try {
    const config = await RepoConfig.findOne()
    if (!config) {
      return res.status(404).json({ error: 'No repository configured yet' })
    }
    res.json({
      repoUrl:         config.repoUrl,
      repoOwner:       config.repoOwner,
      repoName:        config.repoName,
      repoDescription: config.repoDescription || ''
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve configuration' })
  }
})

// POST /api/config — validate, deregister old webhook, register new one, persist
router.post('/', async (req, res) => {
  const { repoUrl, pat, webhookSecret } = req.body
  const errors = {}

  if (!repoUrl || repoUrl.trim() === '')           errors.repoUrl = 'Repository URL is required'
  if (!pat || pat.trim() === '')                   errors.pat = 'GitHub Personal Access Token is required'
  if (!webhookSecret || webhookSecret.trim() === '') errors.webhookSecret = 'Webhook Secret is required'

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', fields: errors })
  }

  // Parse owner/repo from URL
  let repoOwner, repoName
  try {
    ;({ repoOwner, repoName } = parseRepoUrl(repoUrl.trim()))
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  // Deregister existing webhook if one is stored
  const existing = await RepoConfig.findOne()
  if (existing && existing.webhookId) {
    try {
      await deregisterWebhook(existing.repoOwner, existing.repoName, existing.pat, existing.webhookId)
    } catch (err) {
      // Log but don't block — the old repo/PAT may be gone
      console.warn('Failed to deregister previous webhook:', err.message)
    }
  }

  // Register new webhook
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || ''
  const webhookUrl = `${webhookBaseUrl}/api/webhook/github`

  let webhookId
  try {
    webhookId = await registerWebhook(repoOwner, repoName, pat.trim(), webhookUrl, webhookSecret.trim())
  } catch (err) {
    return res.status(502).json({ error: `GitHub API webhook registration failed: ${err.message}` })
  }

  // Fetch repo metadata from GitHub (description + README cached in DB)
  const [repoDescription, readmeContent] = await Promise.all([
    fetchRepoDescription(repoOwner, repoName, pat.trim()),
    fetchReadmeContent(repoOwner, repoName, pat.trim())
  ])
  console.log(`[Config] Repo description: "${repoDescription || '(none)'}"`)
  console.log(`[Config] README fetched: ${readmeContent.length} chars`)

  // Persist config (upsert — only one document ever stored)
  try {
    await RepoConfig.findOneAndUpdate(
      {},
      {
        repoUrl: repoUrl.trim(),
        repoOwner,
        repoName,
        repoDescription,
        readmeContent,
        pat: pat.trim(),
        webhookSecret: webhookSecret.trim(),
        webhookId
      },
      { upsert: true, new: true, runValidators: true }
    )
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save configuration' })
  }

  res.json({ message: 'Repository configured successfully', repoUrl: repoUrl.trim() })

  // Backfill existing open issues asynchronously (don't block the response)
  syncExistingIssues({ repoOwner, repoName, repoDescription, pat: pat.trim() }).catch(err =>
    console.warn('Failed to sync existing issues:', err.message)
  )
})

/**
 * Fetch all open issues from GitHub and persist any not already stored.
 * No Gemini analysis — user triggers that manually per issue.
 */
async function syncExistingIssues({ repoOwner, repoName, repoDescription, pat }) {
  let githubIssues
  try {
    githubIssues = await fetchOpenIssues(repoOwner, repoName, pat)
  } catch (err) {
    console.warn('fetchOpenIssues failed:', err.message)
    return
  }

  for (const ghIssue of githubIssues) {
    const exists = await Issue.findOne({ githubIssueId: ghIssue.id })
    if (exists) continue

    try {
      await Issue.create({
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
  console.log(`Synced ${githubIssues.length} issue(s) from GitHub`)
}

module.exports = router
