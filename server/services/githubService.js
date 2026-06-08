/**
 * Parse owner and repo name from a full GitHub repository URL.
 * Supports both HTTPS and SSH formats.
 * @param {string} repoUrl - e.g. "https://github.com/owner/repo" or "git@github.com:owner/repo.git"
 * @returns {{ repoOwner: string, repoName: string }}
 * @throws {Error} if the URL cannot be parsed
 */
function parseRepoUrl(repoUrl) {
  if (!repoUrl || typeof repoUrl !== 'string') {
    throw new Error('repoUrl must be a non-empty string')
  }

  // HTTPS: https://github.com/owner/repo or https://github.com/owner/repo.git
  const httpsMatch = repoUrl.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
  if (httpsMatch) {
    return { repoOwner: httpsMatch[1], repoName: httpsMatch[2] }
  }

  // SSH: git@github.com:owner/repo.git
  const sshMatch = repoUrl.match(/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (sshMatch) {
    return { repoOwner: sshMatch[1], repoName: sshMatch[2] }
  }

  throw new Error(`Cannot parse owner and repo name from URL: ${repoUrl}`)
}

/**
 * Register a webhook on a GitHub repository.
 * @param {string} repoOwner - Repository owner (user or org)
 * @param {string} repoName  - Repository name
 * @param {string} pat       - GitHub Personal Access Token with admin:repo_hook scope
 * @param {string} webhookUrl - The URL GitHub should deliver events to
 * @param {string} secret    - The secret used to sign webhook payloads
 * @returns {Promise<number>} The created webhook ID
 * @throws {Error} if the GitHub API call fails
 */
async function registerWebhook(repoOwner, repoName, pat, webhookUrl, secret) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/hooks`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['issues'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0'
      }
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${body}`)
  }

  const data = await response.json()
  return data.id
}

/**
 * Deregister (delete) a webhook from a GitHub repository.
 * @param {string} repoOwner - Repository owner
 * @param {string} repoName  - Repository name
 * @param {string} pat       - GitHub Personal Access Token with admin:repo_hook scope
 * @param {number} webhookId - The webhook ID to delete
 * @returns {Promise<void>}
 * @throws {Error} if the GitHub API call fails (non-404 errors)
 */
async function deregisterWebhook(repoOwner, repoName, pat, webhookId) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/hooks/${webhookId}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  // 404 means the hook is already gone — treat as success
  if (!response.ok && response.status !== 404) {
    const body = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${body}`)
  }
}

/**
 * Fetch all currently open issues from a GitHub repository (handles pagination).
 * @param {string} repoOwner
 * @param {string} repoName
 * @param {string} pat
 * @returns {Promise<Array>} Array of GitHub issue objects
 */
async function fetchOpenIssues(repoOwner, repoName, pat) {
  const issues = []
  let page = 1

  while (true) {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?state=open&per_page=100&page=${page}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`GitHub API error ${response.status}: ${body}`)
    }

    const batch = await response.json()
    // GitHub returns pull requests in this endpoint too — filter them out
    const realIssues = batch.filter(i => !i.pull_request)
    issues.push(...realIssues)

    if (batch.length < 100) break
    page++
  }

  return issues
}

module.exports = { parseRepoUrl, registerWebhook, deregisterWebhook, fetchOpenIssues }

