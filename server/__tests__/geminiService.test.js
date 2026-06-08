const fc = require('fast-check')
const { buildPrompt, parseResponse, validateResponse } = require('../services/geminiService')

// Arbitrary for a non-empty trimmed string
const nonEmptyString = fc.string({ minLength: 1 }).map(s => s.trim()).filter(s => s.length > 0)

const repoConfigArb = fc.record({
  repoName:        nonEmptyString,
  repoDescription: nonEmptyString
})

const issueDataArb = fc.record({
  title:  nonEmptyString,
  body:   nonEmptyString,
  labels: fc.array(nonEmptyString, { minLength: 0, maxLength: 5 })
})

// ─── Property 8 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 8: Gemini prompt contains all required context fields
test('Property 8: buildPrompt includes all required context fields', () => {
  // Validates: Requirements 3.1, 3.10
  fc.assert(
    fc.property(repoConfigArb, issueDataArb, (repoConfig, issueData) => {
      const prompt = buildPrompt(repoConfig, issueData)
      expect(typeof prompt).toBe('string')
      expect(prompt).toContain(repoConfig.repoName)
      expect(prompt).toContain(repoConfig.repoDescription)
      expect(prompt).toContain(issueData.title)
      expect(prompt).toContain(issueData.body)
      // Labels should appear in prompt
      issueData.labels.forEach(label => expect(prompt).toContain(label))
      // Must instruct strict JSON only
      expect(prompt.toLowerCase()).toMatch(/json/)
      expect(prompt.toLowerCase()).toMatch(/no markdown|no code fence/i)
    }),
    { numRuns: 100 }
  )
})

// ─── Property 9 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 9: Gemini response parser extracts all seven fields correctly
test('Property 9: parseResponse correctly extracts all seven fields from valid JSON', () => {
  // Validates: Requirements 3.2
  const validResponseArb = fc.record({
    scopeScore:      fc.integer({ min: 0, max: 100 }),
    priority:        fc.constantFrom('Low', 'Medium', 'High'),
    issueWorthiness: fc.constantFrom('Useful', 'Duplicate', 'Out of Scope', 'Too Vague', 'Low Impact'),
    issueType:       fc.constantFrom('Bug Report', 'Feature Request', 'Documentation', 'Question', 'Other'),
    recommendation:  fc.constantFrom('Accept', 'Review Further', 'Reject'),
    confidence:      fc.integer({ min: 0, max: 100 }),
    explanation:     nonEmptyString
  })

  fc.assert(
    fc.property(validResponseArb, (responseObj) => {
      const jsonString = JSON.stringify(responseObj)
      const result = parseResponse(jsonString)
      expect(result.error).toBeUndefined()
      expect(result.data.scopeScore).toBe(responseObj.scopeScore)
      expect(result.data.priority).toBe(responseObj.priority)
      expect(result.data.issueWorthiness).toBe(responseObj.issueWorthiness)
      expect(result.data.issueType).toBe(responseObj.issueType)
      expect(result.data.recommendation).toBe(responseObj.recommendation)
      expect(result.data.confidence).toBe(responseObj.confidence)
      expect(result.data.explanation).toBe(responseObj.explanation)
    }),
    { numRuns: 100 }
  )
})

// ─── Property 10 ─────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 10: Gemini response validation rejects invalid field values
test('Property 10a: validateResponse rejects out-of-range scopeScore', () => {
  // Validates: Requirements 3.3
  const invalidScoreArb = fc.oneof(
    fc.integer({ max: -1 }),
    fc.integer({ min: 101 }),
    fc.float().filter(n => !Number.isInteger(n))
  )

  fc.assert(
    fc.property(invalidScoreArb, (badScore) => {
      const result = validateResponse({
        scopeScore: badScore,
        priority: 'Low',
        issueWorthiness: 'Useful',
        issueType: 'Bug Report',
        recommendation: 'Accept',
        confidence: 50,
        explanation: 'test explanation'
      })
      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    }),
    { numRuns: 100 }
  )
})

test('Property 10b: validateResponse rejects invalid priority', () => {
  // Validates: Requirements 3.4
  const invalidPriorityArb = fc.string().filter(s => !['Low', 'Medium', 'High'].includes(s))

  fc.assert(
    fc.property(invalidPriorityArb, (badPriority) => {
      const result = validateResponse({
        scopeScore: 50,
        priority: badPriority,
        issueWorthiness: 'Useful',
        issueType: 'Bug Report',
        recommendation: 'Accept',
        confidence: 50,
        explanation: 'test explanation'
      })
      expect(result.error).toBeDefined()
    }),
    { numRuns: 100 }
  )
})

test('Property 10c: validateResponse rejects invalid recommendation', () => {
  // Validates: Requirements 3.5
  const invalidRecArb = fc.string().filter(
    s => !['Accept', 'Review Further', 'Reject'].includes(s)
  )

  fc.assert(
    fc.property(invalidRecArb, (badRec) => {
      const result = validateResponse({
        scopeScore: 50,
        priority: 'Low',
        issueWorthiness: 'Useful',
        issueType: 'Bug Report',
        recommendation: badRec,
        confidence: 50,
        explanation: 'test explanation'
      })
      expect(result.error).toBeDefined()
    }),
    { numRuns: 100 }
  )
})

test('Property 10d: validateResponse rejects invalid issueWorthiness', () => {
  // Validates: Requirements 3.6
  const validWorthiness = ['Useful', 'Duplicate', 'Out of Scope', 'Too Vague', 'Low Impact']
  const invalidWorthinessArb = fc.string().filter(s => !validWorthiness.includes(s))

  fc.assert(
    fc.property(invalidWorthinessArb, (badWorthiness) => {
      const result = validateResponse({
        scopeScore: 50,
        priority: 'Low',
        issueWorthiness: badWorthiness,
        issueType: 'Bug Report',
        recommendation: 'Accept',
        confidence: 50,
        explanation: 'test explanation'
      })
      expect(result.error).toBeDefined()
    }),
    { numRuns: 100 }
  )
})

test('Property 10e: validateResponse rejects invalid issueType', () => {
  // Validates: Requirements 3.7
  const validTypes = ['Bug Report', 'Feature Request', 'Documentation', 'Question', 'Other']
  const invalidTypeArb = fc.string().filter(s => !validTypes.includes(s))

  fc.assert(
    fc.property(invalidTypeArb, (badType) => {
      const result = validateResponse({
        scopeScore: 50,
        priority: 'Low',
        issueWorthiness: 'Useful',
        issueType: badType,
        recommendation: 'Accept',
        confidence: 50,
        explanation: 'test explanation'
      })
      expect(result.error).toBeDefined()
    }),
    { numRuns: 100 }
  )
})

test('Property 10f: validateResponse rejects out-of-range confidence', () => {
  // Validates: Requirements 3.8
  const invalidConfidenceArb = fc.oneof(
    fc.integer({ max: -1 }),
    fc.integer({ min: 101 }),
    fc.float().filter(n => !Number.isInteger(n))
  )

  fc.assert(
    fc.property(invalidConfidenceArb, (badConfidence) => {
      const result = validateResponse({
        scopeScore: 50,
        priority: 'Low',
        issueWorthiness: 'Useful',
        issueType: 'Bug Report',
        recommendation: 'Accept',
        confidence: badConfidence,
        explanation: 'test explanation'
      })
      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    }),
    { numRuns: 100 }
  )
})
