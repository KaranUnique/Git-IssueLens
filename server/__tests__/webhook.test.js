const fc = require('fast-check')
const crypto = require('crypto')
const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

// Mock geminiService so tests don't hit the real Gemini API
jest.mock('../services/geminiService', () => ({
  analyzeIssue: jest.fn().mockResolvedValue({
    data: {
      scopeScore: 80,
      priority: 'Medium',
      issueWorthiness: 'Useful',
      issueType: 'Bug Report',
      recommendation: 'Accept',
      confidence: 90,
      explanation: 'Mocked explanation'
    }
  })
}))

// Mock githubService to avoid real GitHub API calls
jest.mock('../services/githubService', () => ({
  parseRepoUrl: jest.fn((url) => {
    const m = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
    if (!m) throw new Error(`Cannot parse owner and repo name from URL: ${url}`)
    return { repoOwner: m[1], repoName: m[2] }
  }),
  registerWebhook: jest.fn().mockResolvedValue(12345),
  deregisterWebhook: jest.fn().mockResolvedValue(undefined)
}))

const app = require('../server')
const Issue = require('../models/Issue')
const RepoConfig = require('../models/RepoConfig')

let mongoServer
const WEBHOOK_SECRET = 'test-secret-abc'

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())

  // Seed a RepoConfig so the webhook handler can find the secret
  await RepoConfig.create({
    repoUrl: 'https://github.com/owner/repo',
    repoOwner: 'owner',
    repoName: 'repo',
    pat: 'ghp_test',
    webhookSecret: WEBHOOK_SECRET,
    webhookId: 1
  })
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

afterEach(async () => {
  await Issue.deleteMany({})
})

// Helper: build a minimal valid GitHub issues.opened payload
function makePayload(overrides = {}) {
  return {
    action: 'opened',
    issue: {
      id: 1,
      html_url: 'https://github.com/owner/repo/issues/1',
      title: 'Test issue',
      body: 'Issue body',
      labels: [{ name: 'bug' }],
      user: { login: 'testuser' }
    },
    repository: {
      name: 'repo',
      description: 'A repo',
      full_name: 'owner/repo'
    },
    ...overrides
  }
}

// Helper: sign a body with the stored secret
function sign(body, secret = WEBHOOK_SECRET) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

const nonEmptyString = fc
  .string({ minLength: 1 })
  .map(s => s.trim())
  .filter(s => s.length > 0)

// ─── Property 5 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 5: Invalid webhook signature is rejected
test('Property 5: Invalid webhook signature is rejected with 401 and no issue created', async () => {
  // Validates: Requirements 2.3
  //
  // For any valid JSON payload, signing it with a DIFFERENT secret must result
  // in a 401 and no issue document being persisted.
  // We constrain to JSON-serializable payloads because GitHub always sends JSON,
  // and the Express JSON parser would fail before signature verification otherwise.

  // Generate a JSON-serializable object with arbitrary string fields
  const payloadArb = fc.record({
    action: nonEmptyString,
    extra: nonEmptyString
  })

  await fc.assert(
    fc.asyncProperty(payloadArb, nonEmptyString, async (payload, wrongSecret) => {
      // Ensure wrongSecret actually differs from the stored secret
      fc.pre(wrongSecret !== WEBHOOK_SECRET)

      await Issue.deleteMany({})

      const bodyStr = JSON.stringify(payload)
      const badSig = sign(bodyStr, wrongSecret)

      const res = await request(app)
        .post('/api/webhook/github')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', badSig)
        .send(bodyStr)

      expect(res.status).toBe(401)
      expect(await Issue.countDocuments()).toBe(0)
    }),
    { numRuns: 100 }
  )
})

// ─── Property 7 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 7: Non-opened webhook actions are ignored
test('Property 7: Non-opened webhook actions return 200 and create no issue', async () => {
  // Validates: Requirements 2.5
  //
  // For any verified webhook payload where action !== 'opened', the endpoint
  // must return 200 and must not persist any issue document.

  const nonOpenedAction = fc.string({ minLength: 1 }).filter(a => a !== 'opened')

  await fc.assert(
    fc.asyncProperty(nonOpenedAction, async (action) => {
      await Issue.deleteMany({})

      const payload = makePayload({ action })
      const bodyStr = JSON.stringify(payload)
      const sig = sign(bodyStr)

      const res = await request(app)
        .post('/api/webhook/github')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', sig)
        .send(payload)

      expect(res.status).toBe(200)
      expect(await Issue.countDocuments()).toBe(0)
    }),
    { numRuns: 100 }
  )
})
