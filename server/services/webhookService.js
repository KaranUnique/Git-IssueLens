const crypto = require('crypto')

/**
 * Verify the HMAC-SHA256 signature of a webhook payload.
 * @param {string} secret - The webhook secret used to sign the payload
 * @param {string|Buffer} rawBody - The raw request body
 * @param {string} signatureHeader - The X-Hub-Signature-256 header value (e.g. "sha256=abc123")
 * @returns {boolean} true if valid, false otherwise
 */
function verifySignature(secret, rawBody, signatureHeader) {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false

  const expectedSignature = signatureHeader.slice('sha256='.length)
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    // Buffer lengths differ — signature is invalid
    return false
  }
}

/**
 * Extract relevant issue data from a GitHub webhook payload.
 * @param {Object} payload - The parsed GitHub webhook payload
 * @returns {{ title, body, labels, userLogin, repoName, repoDescription }}
 */
function extractIssueData(payload) {
  const { issue = {}, repository = {} } = payload

  const title = issue.title || ''
  const body = issue.body || ''
  const labels = Array.isArray(issue.labels)
    ? issue.labels.map(l => (typeof l === 'string' ? l : l.name || '')).filter(Boolean)
    : []
  const userLogin = (issue.user && issue.user.login) || ''
  const repoName = repository.name || ''
  const repoDescription = repository.description || ''

  return { title, body, labels, userLogin, repoName, repoDescription }
}

module.exports = { verifySignature, extractIssueData }
