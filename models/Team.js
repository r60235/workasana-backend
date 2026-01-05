const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Team name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Team name cannot exceed 50 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  }
}, {
  timestamps: true
});


module.exports = mongoose.model('Team', teamSchema);