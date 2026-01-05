const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Task name is required'],
    trim: true,
    maxlength: [200, 'Task name cannot exceed 200 characters']
  },
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: [true, 'Project is required']
  },
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team', 
    required: [true, 'Team is required']
  },
  owners: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }],
  tags: [{ 
    type: String,
    trim: true
  }],
  timeToComplete: { 
    type: Number, 
    required: [true, 'Time to complete is required'],
    min: [0.1, 'Time to complete must be at least 0.1 days']
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed', 'Blocked'],
    default: 'To Do'
  }
}, {
  timestamps: true
});

taskSchema.index({ projectId: 1 });
taskSchema.index({ teamId: 1 });
taskSchema.index({ owners: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);