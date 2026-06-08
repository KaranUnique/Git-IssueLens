const fc = require('fast-check')
const crypto = require('crypto')
const { verifySignature, extractIssueData } = require('../services/webhookService')

const nonEmptyString = fc.string({ minLength: 1 }).map(s => s.trim()).filter(s => s.length > 0)

// ─── Property 4 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 4: Valid webhook signature passes verification
test('Property 4: Valid webhook signature passes verification', () => {
  // Validates: Requirements 2.2
  fc.assert(
    fc.property(nonEmptyString, nonEmptyString, (secret, body) => {
      const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
      expect(verifySignature(secret, body, sig)).toBe(true)
    }),
    { numRuns: 100 }
  )
})

// ─── Property 6 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 6: Webhook payload extraction captures all required fields
test('Property 6: Webhook payload extraction captures all required fields', () => {
  // Validates: Requirements 2.4
  const labelArb = fc.record({ name: nonEmptyString })

  const payloadArb = fc.record({
    issue: fc.record({
      title: nonEmptyString,
      body: nonEmptyString,
      labels: fc.array(labelArb, { minLength: 0, maxLength: 5 }),
      user: fc.record({ login: nonEmptyString })
    }),
    repository: fc.record({
      name: nonEmptyString,
      description: nonEmptyString
    })
  })

  fc.assert(
    fc.property(payloadArb, (payload) => {
      const result = extractIssueData(payload)

      expect(result.title).toBe(payload.issue.title)
      expect(result.body).toBe(payload.issue.body)
      expect(result.userLogin).toBe(payload.issue.user.login)
      expect(result.repoName).toBe(payload.repository.name)
      expect(result.repoDescription).toBe(payload.repository.description)

      // Labels must be a string array matching the name fields
      const expectedLabels = payload.issue.labels.map(l => l.name)
      expect(result.labels).toEqual(expectedLabels)
    }),
    { numRuns: 100 }
  )
})
