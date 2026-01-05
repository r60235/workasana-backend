const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Project name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Project', projectSchema);