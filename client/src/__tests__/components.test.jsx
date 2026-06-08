import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import fc from 'fast-check'
import WorthinessBadge from '../components/WorthinessBadge'
import IssueCard from '../components/IssueCard'

// ─── Property 12 ─────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 12: Issue worthiness badge renders correct color class
describe('Property 12: WorthinessBadge renders correct color class for each worthiness value', () => {
  // Validates: Requirements 4.4
  const cases = [
    { value: 'Useful',       expectedColor: 'green' },
    { value: 'Duplicate',    expectedColor: 'yellow' },
    { value: 'Out of Scope', expectedColor: 'red' },
    { value: 'Too Vague',    expectedColor: 'orange' },
    { value: 'Low Impact',   expectedColor: 'gray' }
  ]

  test.each(cases)(
    'renders $expectedColor class for "$value"',
    ({ value, expectedColor }) => {
      const { container } = render(<WorthinessBadge value={value} />)
      const badge = container.querySelector('[data-worthiness]')
      expect(badge).not.toBeNull()
      expect(badge.className).toContain(expectedColor)
    }
  )

  test('all five worthiness values render with matching text and a color class', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Useful', 'Duplicate', 'Out of Scope', 'Too Vague', 'Low Impact'),
        (value) => {
          const colorMap = {
            'Useful':       'green',
            'Duplicate':    'yellow',
            'Out of Scope': 'red',
            'Too Vague':    'orange',
            'Low Impact':   'gray'
          }
          const { container } = render(<WorthinessBadge value={value} />)
          const badge = container.querySelector('[data-worthiness]')
          expect(badge).not.toBeNull()
          expect(badge.textContent).toBe(value)
          expect(badge.className).toContain(colorMap[value])
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 13 ─────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 13: Decided issue buttons are disabled
test('Property 13: IssueCard disables Accept and Reject buttons when decision is Accepted or Rejected', () => {
  // Validates: Requirements 5.4
  fc.assert(
    fc.property(
      fc.constantFrom('Accepted', 'Rejected'),
      (decision) => {
        const issue = {
          _id: 'test-id',
          title: 'Test issue',
          userLogin: 'octocat',
          repoName: 'my-repo',
          maintainerDecision: decision,
          analysisStatus: 'complete',
          scopeScore: 80,
          priority: 'High',
          issueType: 'Bug Report',
          recommendation: 'Accept',
          issueWorthiness: 'Useful',
          confidence: 90,
          explanation: 'Looks good'
        }
        const { getAllByRole } = render(<IssueCard issue={issue} />)
        const buttons = getAllByRole('button')
        const acceptBtn = buttons.find(b => b.textContent.trim() === 'Accept')
        const rejectBtn = buttons.find(b => b.textContent.trim() === 'Reject')
        expect(acceptBtn).toBeDisabled()
        expect(rejectBtn).toBeDisabled()
      }
    ),
    { numRuns: 100 }
  )
})

// ─── Property 11 ─────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 11: Issue card renders all required AI analysis fields
test('Property 11: IssueCard displays all required AI analysis fields when analysisStatus is complete', () => {
  // Validates: Requirements 4.2, 4.3
  const scopeScoreArb     = fc.integer({ min: 0, max: 100 })
  const priorityArb       = fc.constantFrom('Low', 'Medium', 'High')
  const issueTypeArb      = fc.constantFrom('Bug Report', 'Feature Request', 'Documentation', 'Question', 'Other')
  const recommendationArb = fc.constantFrom('Accept', 'Review Further', 'Reject')
  const worthinessArb     = fc.constantFrom('Useful', 'Duplicate', 'Out of Scope', 'Too Vague', 'Low Impact')
  const confidenceArb     = fc.integer({ min: 0, max: 100 })
  const explanationArb    = fc.string({ minLength: 1 }).map(s => s.trim()).filter(s => s.length > 0)
  const loginArb          = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)
  const repoNameArb       = fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)

  fc.assert(
    fc.property(
      scopeScoreArb, priorityArb, issueTypeArb, recommendationArb, worthinessArb,
      confidenceArb, explanationArb, loginArb, repoNameArb,
      (scopeScore, priority, issueType, recommendation, issueWorthiness, confidence, explanation, userLogin, repoName) => {
        const issue = {
          _id: 'test-id',
          title: 'Test issue',
          userLogin,
          repoName,
          maintainerDecision: 'Pending',
          analysisStatus: 'complete',
          scopeScore,
          priority,
          issueType,
          recommendation,
          issueWorthiness,
          confidence,
          explanation
        }
        const { container } = render(<IssueCard issue={issue} />)
        const text = container.textContent

        // scopeScore is displayed
        expect(text).toContain(`${scopeScore}/100`)
        // priority is displayed
        expect(text).toContain(priority)
        // issueType is displayed
        expect(text).toContain(issueType)
        // recommendation is displayed
        expect(text).toContain(recommendation)
        // worthiness badge is present
        expect(container.querySelector('[data-worthiness]')).not.toBeNull()
        // confidence bar is present
        expect(container.querySelector('[data-confidence]')).not.toBeNull()
        // explanation is displayed
        expect(text).toContain(explanation)
        // userLogin is displayed
        expect(text).toContain(userLogin)
        // repoName is displayed
        expect(text).toContain(repoName)
      }
    ),
    { numRuns: 100 }
  )
})
