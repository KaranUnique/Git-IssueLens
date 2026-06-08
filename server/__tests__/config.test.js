const fc = require('fast-check')
const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

// Mock githubService so tests never hit the real GitHub API
jest.mock('../services/githubService', () => ({
  parseRepoUrl: jest.fn((url) => {
    // Minimal real implementation so validation still works
    const m = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
    if (!m) throw new Error(`Cannot parse owner and repo name from URL: ${url}`)
    return { repoOwner: m[1], repoName: m[2] }
  }),
  registerWebhook: jest.fn().mockResolvedValue(12345),
  deregisterWebhook: jest.fn().mockResolvedValue(undefined),
  fetchOpenIssues: jest.fn().mockResolvedValue([])
}))

const app = require('../server')
const RepoConfig = require('../models/RepoConfig')

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
  await RepoConfig.deleteMany({})
  jest.clearAllMocks()
})

// Arbitraries
const nonEmptyString = fc
  .string({ minLength: 1 })
  .map(s => s.trim())
  .filter(s => s.length > 0)

// Valid GitHub HTTPS repo URLs — owner and repo must not contain '/' or whitespace
const safeSegment = fc
  .string({ minLength: 1 })
  .map(s => s.replace(/[/\s]/g, 'x'))
  .filter(s => s.length > 0)

const repoUrlArb = fc
  .tuple(safeSegment, safeSegment)
  .map(([owner, repo]) => `https://github.com/${owner}/${repo}`)

const configArb = fc.record({
  repoUrl:       repoUrlArb,
  pat:           nonEmptyString,
  webhookSecret: nonEmptyString
})

// ─── Property 1 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 1: Repository config round-trip
test('Property 1: POST config then GET returns the same repoUrl', async () => {
  // Validates: Requirements 1.2
  await fc.assert(
    fc.asyncProperty(configArb, async (config) => {
      await RepoConfig.deleteMany({})

      const postRes = await request(app).post('/api/config').send(config)
      expect(postRes.status).toBe(200)

      const getRes = await request(app).get('/api/config')
      expect(getRes.status).toBe(200)
      expect(getRes.body.repoUrl).toBe(config.repoUrl)
    }),
    { numRuns: 100 }
  )
})

// ─── Property 2 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 2: Repository config upsert overwrites previous data
test('Property 2: Saving config B after config A results in only B being stored', async () => {
  // Validates: Requirements 1.7
  await fc.assert(
    fc.asyncProperty(configArb, configArb, async (configA, configB) => {
      await RepoConfig.deleteMany({})

      await request(app).post('/api/config').send(configA)
      await request(app).post('/api/config').send(configB)

      const getRes = await request(app).get('/api/config')
      expect(getRes.status).toBe(200)
      expect(getRes.body.repoUrl).toBe(configB.repoUrl)

      // Only one document should exist
      const count = await RepoConfig.countDocuments()
      expect(count).toBe(1)
    }),
    { numRuns: 100 }
  )
})

// ─── Property 3 ──────────────────────────────────────────────────────────────
// Feature: github-webhook-issue-analyzer, Property 3: Config form rejects incomplete submissions
test('Property 3: Config with missing/empty fields is rejected with 4xx and no document saved', async () => {
  // Validates: Requirements 1.3
  const emptyStringArb = fc.constantFrom('', '   ', '\t', '\n')

  // Missing repoUrl
  await fc.assert(
    fc.asyncProperty(emptyStringArb, nonEmptyString, nonEmptyString, async (badUrl, pat, secret) => {
      await RepoConfig.deleteMany({})
      const res = await request(app).post('/api/config').send({ repoUrl: badUrl, pat, webhookSecret: secret })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
      expect(await RepoConfig.countDocuments()).toBe(0)
    }),
    { numRuns: 50 }
  )

  // Missing pat
  await fc.assert(
    fc.asyncProperty(repoUrlArb, emptyStringArb, nonEmptyString, async (url, badPat, secret) => {
      await RepoConfig.deleteMany({})
      const res = await request(app).post('/api/config').send({ repoUrl: url, pat: badPat, webhookSecret: secret })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
      expect(await RepoConfig.countDocuments()).toBe(0)
    }),
    { numRuns: 50 }
  )

  // Missing webhookSecret
  await fc.assert(
    fc.asyncProperty(repoUrlArb, nonEmptyString, emptyStringArb, async (url, pat, badSecret) => {
      await RepoConfig.deleteMany({})
      const res = await request(app).post('/api/config').send({ repoUrl: url, pat, webhookSecret: badSecret })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
      expect(await RepoConfig.countDocuments()).toBe(0)
    }),
    { numRuns: 50 }
  )
})
