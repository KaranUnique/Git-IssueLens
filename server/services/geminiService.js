const { GoogleGenerativeAI } = require('@google/generative-ai')

const VALID_PRIORITIES = ['Low', 'Medium', 'High']
const VALID_RECOMMENDATIONS = ['Accept', 'Review Further', 'Reject']
const VALID_WORTHINESS = ['Useful', 'Duplicate', 'Out of Scope', 'Too Vague', 'Low Impact']
const VALID_ISSUE_TYPES = ['Bug Report', 'Feature Request', 'Documentation', 'Question', 'Other']

/**
 * Build the prompt string sent to Gemini.
 * @param {Object} repoConfig - { repoName, repoDescription, ... }
 * @param {Object} issueData  - { title, body, labels, userLogin, repoName, repoDescription }
 * @returns {string}
 */
function buildPrompt(repoConfig, issueData) {
  const repoName        = repoConfig.repoName        || issueData.repoName        || ''
  const repoDescription = repoConfig.repoDescription || issueData.repoDescription || ''
  const readmeContent   = repoConfig.readmeContent   || ''
  const labels = Array.isArray(issueData.labels) ? issueData.labels.join(', ') : (issueData.labels || '')

  const readmeSection = readmeContent
    ? `\nREPOSITORY README (use as primary source of truth for project scope and purpose):\n${readmeContent}\n`
    : ''

  return `You are a senior software project maintainer evaluating a GitHub issue.

REPOSITORY CONTEXT:
- Repository Name: ${repoName}
- Repository Description: ${repoDescription}${readmeSection}
ISSUE SUBMITTED:
- Issue Title: ${issueData.title}
- Issue Body: ${issueData.body || ''}
- Issue Labels: ${labels}

Use the README (if provided) as the primary source of truth for the project's purpose, features, supported functionality, technologies, and contribution expectations.
Analyze whether this issue aligns with the project's actual scope and respond ONLY with a valid JSON object — no markdown, no code fences, no extra text.

The JSON must have exactly these fields:
{
  "scopeScore": <integer 0-100 indicating how well the issue matches the repository scope>,
  "priority": <"Low" | "Medium" | "High">,
  "issueWorthiness": <"Useful" | "Duplicate" | "Out of Scope" | "Too Vague" | "Low Impact">,
  "issueType": <"Bug Report" | "Feature Request" | "Documentation" | "Question" | "Other">,
  "recommendation": <"Accept" | "Review Further" | "Reject">,
  "confidence": <integer 0-100 indicating confidence in this analysis>,
  "explanation": <one or two sentence explanation of your recommendation>
}`
}

/**
 * Parse raw Gemini response text into a structured object.
 * @param {string} responseText
 * @returns {{ data: Object }|{ error: string }}
 */
function parseResponse(responseText) {
  try {
    // Strip accidental markdown code fences if present
    const cleaned = responseText.replace(/```(?:json)?/gi, '').trim()
    const parsed = JSON.parse(cleaned)
    return { data: parsed }
  } catch {
    return { error: 'Gemini response is not valid JSON' }
  }
}

/**
 * Validate a parsed Gemini response object against expected shapes and ranges.
 * @param {Object} parsed
 * @returns {{ data: Object }|{ error: string }}
 */
function validateResponse(parsed) {
  if (typeof parsed !== 'object' || parsed === null) {
    return { error: 'Gemini response is not an object' }
  }

  const { scopeScore, priority, issueWorthiness, issueType, recommendation, confidence, explanation } = parsed

  if (
    typeof scopeScore !== 'number' ||
    !Number.isInteger(scopeScore) ||
    scopeScore < 0 ||
    scopeScore > 100
  ) {
    return { error: `Invalid scopeScore: ${scopeScore}. Must be integer 0–100.` }
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return { error: `Invalid priority: ${priority}. Must be one of ${VALID_PRIORITIES.join(', ')}.` }
  }

  if (!VALID_WORTHINESS.includes(issueWorthiness)) {
    return { error: `Invalid issueWorthiness: ${issueWorthiness}. Must be one of ${VALID_WORTHINESS.join(', ')}.` }
  }

  if (!VALID_ISSUE_TYPES.includes(issueType)) {
    return { error: `Invalid issueType: ${issueType}. Must be one of ${VALID_ISSUE_TYPES.join(', ')}.` }
  }

  if (!VALID_RECOMMENDATIONS.includes(recommendation)) {
    return { error: `Invalid recommendation: ${recommendation}. Must be one of ${VALID_RECOMMENDATIONS.join(', ')}.` }
  }

  if (
    typeof confidence !== 'number' ||
    !Number.isInteger(confidence) ||
    confidence < 0 ||
    confidence > 100
  ) {
    return { error: `Invalid confidence: ${confidence}. Must be integer 0–100.` }
  }

  if (typeof explanation !== 'string' || explanation.trim() === '') {
    return { error: 'Explanation must be a non-empty string.' }
  }

  return {
    data: {
      scopeScore,
      priority,
      issueWorthiness,
      issueType,
      recommendation,
      confidence,
      explanation: explanation.trim()
    }
  }
}

/**
 * Orchestrate prompt build, Gemini API call (with retry), parse, and validate.
 * @param {Object} repoConfig
 * @param {Object} issueData
 * @returns {{ data: Object }|{ error: string }}
 */
async function analyzeIssue(repoConfig, issueData) {
  const MODEL_NAME = 'gemini-2.0-flash'
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 2000

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })

  console.log(`[Gemini] Using model: ${MODEL_NAME}`)

  const prompt = buildPrompt(repoConfig, issueData)

  let lastError = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Gemini] Attempt ${attempt}/${MAX_RETRIES} for "${issueData.title}"`)
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      console.log(`[Gemini] Success on attempt ${attempt}`)

      const parsed = parseResponse(responseText)
      if (parsed.error) return parsed
      return validateResponse(parsed.data)
    } catch (err) {
      lastError = err
      const msg = err.message || ''
      const isRetryable = msg.includes('429') || msg.includes('503') ||
                          msg.includes('Too Many Requests') ||
                          msg.includes('Service Unavailable') ||
                          msg.includes('rate limit') ||
                          msg.includes('overloaded')

      console.error(`[Gemini] Attempt ${attempt} failed: ${msg}`)

      if (!isRetryable || attempt === MAX_RETRIES) break

      console.log(`[Gemini] Retryable error — waiting ${RETRY_DELAY_MS}ms before retry…`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }

  const msg = lastError?.message || 'Unknown error'
  console.error(`[Gemini] All ${MAX_RETRIES} attempts failed. Last error: ${msg}`)

  if (msg.includes('429') || msg.includes('Too Many Requests')) {
    return { error: 'Gemini rate limit reached. Please wait a moment and try again.' }
  }
  if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded')) {
    return { error: 'Gemini service is temporarily unavailable. Please try again shortly.' }
  }
  return { error: `Gemini analysis failed: ${msg}` }
}

module.exports = { buildPrompt, parseResponse, validateResponse, analyzeIssue }
