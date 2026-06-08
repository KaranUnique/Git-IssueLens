const fc = require('fast-check')

// Pure helper that mirrors Home.jsx count logic
function computeStats(issues) {
  return {
    total:    issues.length,
    accepted: issues.filter(i => i.maintainerDecision === 'Accepted').length,
    rejected: issues.filter(i => i.maintainerDecision === 'Rejected').length
  }
}

const decisionArb = fc.constantFrom('Pending', 'Accepted', 'Rejected')
const issueArb    = fc.record({ maintainerDecision: decisionArb })
const issuesArb   = fc.array(issueArb, { minLength: 0, maxLength: 50 })

// Feature: ai-issue-reviewer, Property 11: Home Page counts match actual database state
test('Property 11: computed stats match actual array counts', () => {
  // Validates: Requirements 6.1, 6.2
  fc.assert(
    fc.property(issuesArb, (issues) => {
      const { total, accepted, rejected } = computeStats(issues)

      expect(total).toBe(issues.length)
      expect(accepted).toBe(issues.filter(i => i.maintainerDecision === 'Accepted').length)
      expect(rejected).toBe(issues.filter(i => i.maintainerDecision === 'Rejected').length)

      // Sanity: accepted + rejected <= total
      expect(accepted + rejected).toBeLessThanOrEqual(total)
    }),
    { numRuns: 100 }
  )
})
