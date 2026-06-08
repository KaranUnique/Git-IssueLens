const mongoose = require('mongoose')

const repoConfigSchema = new mongoose.Schema({
  repoUrl:         { type: String, required: true, trim: true },
  repoOwner:       { type: String, required: true, trim: true },
  repoName:        { type: String, required: true, trim: true },
  repoDescription: { type: String, default: '' },
  readmeContent:   { type: String, default: '' },
  pat:             { type: String, required: true },
  webhookSecret:   { type: String, required: true },
  webhookId:       { type: Number, default: null }
})

module.exports = mongoose.model('RepoConfig', repoConfigSchema)
