const fc = require('fast-check')
const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const app = require('../server')
const Issue = require('../models/Issue')

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

afterEach(async () => {
  await Issue.deleteMany({})
})

// Helper: insert a minimal valid issue directly into MongoDB
function makeIssueDoc(overrides = {}) {
  return {
    githubIssueId: 1,
    githubIssueUrl: 'https://github.com/owner/repo/issues/1',
    repoName: 'owner/repo',
    title: 'Test issue',
    userLogin: 'testuser',
    ...overrides
  }
}

// ─── Property 14 ─────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 14: Maintainer decision persists correctly
test('Property 14: PATCH with Accepted or Rejected persists the correct decision', async () => {
  // Validates: Requirements 5.2, 5.3
  const decisionArb = fc.constantFrom('Accepted', 'Rejected')

  await fc.assert(
    fc.asyncProperty(decisionArb, async (decision) => {
      await Issue.deleteMany({})

      // Insert issue directly (bypassing webhook flow)
      const created = await Issue.create(makeIssueDoc())
      const id = created._id.toString()

      // Apply decision via PATCH
      const patchRes = await request(app)
        .patch(`/api/issues/${id}/decision`)
        .send({ decision })
      expect(patchRes.status).toBe(200)
      expect(patchRes.body.maintainerDecision).toBe(decision)

      // Verify via GET /api/issues
      const getRes = await request(app).get('/api/issues')
      expect(getRes.status).toBe(200)
      const saved = getRes.body.find(i => i._id === id)
      expect(saved).toBeDefined()
      expect(saved.maintainerDecision).toBe(decision)
    }),
    { numRuns: 100 }
  )
}, 30000)
