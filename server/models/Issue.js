const mongoose = require('mongoose')

const issueSchema = new mongoose.Schema({
  sessionId:      { type: String, required: true, index: true },
  // From GitHub webhook payload
  githubIssueId:  { type: Number, required: true },
  githubIssueUrl: { type: String, required: true },
  repoName:       { type: String, required: true },
  title:          { type: String, required: true },
  body:           { type: String, default: '' },
  labels:         { type: [String], default: [] },
  userLogin:      { type: String, required: true },

  // AI analysis fields
  scopeScore:      { type: Number, min: 0, max: 100, default: null },
  priority:        { type: String, enum: ['Low', 'Medium', 'High'], default: null },
  issueWorthiness: {
    type: String,
    enum: ['Useful', 'Duplicate', 'Out of Scope', 'Too Vague', 'Low Impact'],
    default: null
  },
  issueType: {
    type: String,
    enum: ['Bug Report', 'Feature Request', 'Documentation', 'Question', 'Other'],
    default: null
  },
  recommendation: {
    type: String,
    enum: ['Accept', 'Review Further', 'Reject'],
    default: null
  },
  confidence:     { type: Number, min: 0, max: 100, default: null },
  explanation:    { type: String, default: null },
  analysisStatus: {
    type: String,
    enum: ['pending', 'complete', 'error'],
    default: 'pending'
  },

  // Maintainer decision
  maintainerDecision: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  },

  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Issue', issueSchema)
