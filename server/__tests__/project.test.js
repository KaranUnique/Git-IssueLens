const fc = require('fast-check')
const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const app = require('../server')

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
  // Clear the projects collection between tests
  await mongoose.connection.collection('projects').deleteMany({})
})

const nonEmptyString = fc
  .string({ minLength: 1 })
  .map(s => s.trim())
  .filter(s => s.length > 0)

const projectArb = fc.record({
  name:         nonEmptyString,
  description:  nonEmptyString,
  scope:        nonEmptyString,
  technologies: nonEmptyString
})

// ─── Property 1 ──────────────────────────────────────────────────────────────
// Feature: ai-issue-reviewer, Property 1: Project data round-trip
test('Property 1: POST then GET returns equivalent project object', async () => {
  // Validates: Requirements 1.2
  await fc.assert(
    fc.asyncProperty(projectArb, async (project) => {
      await mongoose.connection.collection('projects').deleteMany({})

      const postRes = await request(app).post('/api/project').send(project)
      expect(postRes.status).toBe(200)

      const getRes = await request(app).get('/api/project')
      expect(getRes.status).toBe(200)
      expect(getRes.body.name).toBe(project.name)
      expect(getRes.body.description).toBe(project.description)
      expect(getRes.body.scope).toBe(project.scope)
      expect(getRes.body.technologies).toBe(project.technologies)
    }),
    { numRuns: 100 }
  )
})

// ─── Property 2 ──────────────────────────────────────────────────────────────
// Feature: ai-issue-reviewer, Property 2: Project upsert overwrites previous data
test('Property 2: Saving project B after project A results in only B being stored', async () => {
  // Validates: Requirements 1.5
  await fc.assert(
    fc.asyncProperty(projectArb, projectArb, async (projectA, projectB) => {
      await mongoose.connection.collection('projects').deleteMany({})

      await request(app).post('/api/project').send(projectA)
      await request(app).post('/api/project').send(projectB)

      const getRes = await request(app).get('/api/project')
      expect(getRes.status).toBe(200)
      expect(getRes.body.name).toBe(projectB.name)
      expect(getRes.body.description).toBe(projectB.description)
      expect(getRes.body.scope).toBe(projectB.scope)
      expect(getRes.body.technologies).toBe(projectB.technologies)

      // Only one document should exist
      const count = await mongoose.connection.collection('projects').countDocuments()
      expect(count).toBe(1)
    }),
    { numRuns: 100 }
  )
})
