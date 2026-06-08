const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  description:  { type: String, required: true, trim: true },
  scope:        { type: String, required: true, trim: true },
  technologies: { type: String, required: true, trim: true }
})

module.exports = mongoose.model('Project', projectSchema)
