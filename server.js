const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// import database connection and models
const connectDB = require("./config/database");
const User = require("./models/User");
const Team = require("./models/Team");
const Project = require("./models/Project");
const Task = require("./models/Task");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "workasana_jwt_secret_key";
const PORT = process.env.PORT || 5000;

// connect to database
connectDB();

// basic setup
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5177"],
  credentials: true
}));
app.use(express.json());

// in-memory storage for tags only
let tags = [];

// helper functions
const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// auth routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // check if user already exists in MongoDB
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // create new user in MongoDB
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    // save user to database
    await user.save();
    
    // generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
    
    // return token and user info (without password)
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // find user in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
    
    // return token and user info
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

app.get("/api/auth/me", verifyJWT, async (req, res) => {
  try {
    // find user in MongoDB by ID from JWT token
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// user routes
app.get("/api/users", verifyJWT, async (req, res) => {
  try {
    // get all users from MongoDB (excluding passwords)
    const users = await User.find({}).select('-password');
    const userList = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email
    }));
    res.json(userList);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// team routes
app.post("/api/teams", verifyJWT, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // check if team already exists
    const existingTeam = await Team.findOne({ name: name.toLowerCase() });
    if (existingTeam) {
      return res.status(400).json({ message: "Team name already exists" });
    }

    // create new team in MongoDB
    const team = new Team({ name, description });
    await team.save();
    
    // format response to match frontend expectations
    const formattedTeam = {
      id: team._id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    };
    
    res.status(201).json(formattedTeam);
  } catch (error) {
    console.error("Create team error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/teams", verifyJWT, async (req, res) => {
  try {
    const teams = await Team.find({});
    // format response to match frontend expectations
    const formattedTeams = teams.map(team => ({
      id: team._id,
      name: team.name,
      description: team.description,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    }));
    res.json(formattedTeams);
  } catch (error) {
    console.error("Get teams error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// project routes
app.post("/api/projects", verifyJWT, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // check if project already exists
    const existingProject = await Project.findOne({ name: name.toLowerCase() });
    if (existingProject) {
      return res.status(400).json({ message: "Project name already exists" });
    }

    // create new project in MongoDB
    const project = new Project({ name, description });
    await project.save();
    
    // format response to match frontend expectations
    const formattedProject = {
      id: project._id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
    
    res.status(201).json(formattedProject);
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/projects", verifyJWT, async (req, res) => {
  try {
    const projects = await Project.find({});
    // format response to match frontend expectations
    const formattedProjects = projects.map(project => ({
      id: project._id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }));
    res.json(formattedProjects);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// task routes
app.post("/api/tasks", verifyJWT, async (req, res) => {
  try {
    const { name, projectId, teamId, owners, tags, timeToComplete } = req.body;
    
    // verify project and team exist
    const [project, team] = await Promise.all([
      Project.findById(projectId),
      Team.findById(teamId)
    ]);

    if (!project) {
      return res.status(400).json({ message: "Project not found" });
    }
    if (!team) {
      return res.status(400).json({ message: "Team not found" });
    }

    // create new task in MongoDB
    const task = new Task({
      name,
      projectId,
      teamId,
      owners: owners && owners.length > 0 ? owners : [req.user.id],
      tags: tags || [],
      timeToComplete: timeToComplete || 1,
      status: "To Do"
    });

    await task.save();
    
    // format response to match frontend expectations
    const formattedTask = {
      id: task._id,
      name: task.name,
      projectId: task.projectId,
      teamId: task.teamId,
      owners: task.owners,
      tags: task.tags,
      timeToComplete: task.timeToComplete,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
    
    res.status(201).json(formattedTask);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/tasks", verifyJWT, async (req, res) => {
  try {
    const { team, owner, project, status, tags } = req.query;
    let filter = {};

    // build filter object
    if (team) filter.teamId = team;
    if (owner) filter.owners = { $in: [owner] };
    if (project) filter.projectId = project;
    if (status) filter.status = status;
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }

    // get tasks with populated references
    const tasks = await Task.find(filter)
      .populate('projectId', 'name description')
      .populate('teamId', 'name description')
      .populate('owners', 'name email')
      .sort({ createdAt: -1 });

    // format response to match frontend expectations
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      name: task.name,
      projectId: task.projectId._id,
      teamId: task.teamId._id,
      owners: task.owners.map(owner => owner._id),
      tags: task.tags,
      timeToComplete: task.timeToComplete,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: {
        id: task.projectId._id,
        name: task.projectId.name,
        description: task.projectId.description
      },
      team: {
        id: task.teamId._id,
        name: task.teamId.name,
        description: task.teamId.description
      },
      ownerDetails: task.owners.map(owner => ({
        id: owner._id,
        name: owner.name,
        email: owner.email
      }))
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/tasks/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const task = await Task.findByIdAndUpdate(
      id, 
      { ...updates, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    );
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/tasks/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// tag routes
app.post("/api/tags", verifyJWT, (req, res) => {
  try {
    const { name } = req.body;
    const existingTag = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existingTag) {
      return res.status(400).json({ message: "Tag already exists" });
    }

    const tag = { id: generateId(), name, createdAt: new Date() };
    tags.push(tag);
    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/tags", verifyJWT, (req, res) => {
  res.json(tags);
});

// report routes
app.get("/api/report/last-week", verifyJWT, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const completedTasks = await Task.find({
      status: "Completed",
      updatedAt: { $gte: oneWeekAgo }
    }).populate('projectId teamId owners', 'name');
    
    res.json({ count: completedTasks.length, tasks: completedTasks });
  } catch (error) {
    console.error("Last week report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/report/pending", verifyJWT, async (req, res) => {
  try {
    const pendingTasks = await Task.find({
      status: { $in: ["To Do", "In Progress", "Blocked"] }
    });
    
    const totalTime = pendingTasks.reduce((sum, task) => sum + task.timeToComplete, 0);
    res.json({ totalDays: totalTime, taskCount: pendingTasks.length, tasks: pendingTasks });
  } catch (error) {
    console.error("Pending report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/report/closed-tasks", verifyJWT, async (req, res) => {
  try {
    const completedTasks = await Task.find({ status: "Completed" })
      .populate('teamId', 'name')
      .populate('projectId', 'name')
      .populate('owners', 'name');
    
    const byTeam = {};
    const byProject = {};
    const byOwner = {};

    completedTasks.forEach(task => {
      if (task.teamId) {
        byTeam[task.teamId.name] = (byTeam[task.teamId.name] || 0) + 1;
      }
      
      if (task.projectId) {
        byProject[task.projectId.name] = (byProject[task.projectId.name] || 0) + 1;
      }
      
      task.owners.forEach(owner => {
        if (owner) {
          byOwner[owner.name] = (byOwner[owner.name] || 0) + 1;
        }
      });
    });

    res.json({ byTeam, byProject, byOwner, totalCompleted: completedTasks.length });
  } catch (error) {
    console.error("Closed tasks report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// health check
app.get("/api/health", async (req, res) => {
  try {
    const [userCount, teamCount, projectCount, taskCount] = await Promise.all([
      User.countDocuments(),
      Team.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments()
    ]);
    
    res.json({ 
      message: "Workasana API is running!",
      timestamp: new Date().toISOString(),
      users: userCount,
      teams: teamCount,
      projects: projectCount,
      tasks: taskCount
    });
  } catch (error) {
    res.json({ 
      message: "Workasana API is running!",
      timestamp: new Date().toISOString(),
      error: "Could not fetch database counts"
    });
  }
});

// sample data initialization for MongoDB
const initSampleData = async () => {
  try {
    // check if data already exists
    const [userCount, teamCount, projectCount, taskCount] = await Promise.all([
      User.countDocuments(),
      Team.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments()
    ]);

    if (userCount > 0 && teamCount > 0 && projectCount > 0) {
      console.log("Sample data already exists, skipping initialization");
      console.log(`Current data: Users: ${userCount}, Teams: ${teamCount}, Projects: ${projectCount}, Tasks: ${taskCount}`);
      return;
    }

    console.log("Initializing comprehensive sample data...");

    // create sample users
    const sampleUsers = [
      { name: "John Doe", email: "john@example.com", password: "password123" },
      { name: "Jane Smith", email: "jane@example.com", password: "password123" },
      { name: "Mike Johnson", email: "mike@example.com", password: "password123" },
      { name: "Sarah Wilson", email: "sarah@example.com", password: "password123" },
      { name: "David Brown", email: "david@example.com", password: "password123" }
    ];

    const createdUsers = [];
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: hashedPassword
        });
        const savedUser = await user.save();
        createdUsers.push(savedUser);
      } else {
        createdUsers.push(existingUser);
      }
    }

    // create sample teams
    const sampleTeams = [
      { name: "Design Team", description: "UI/UX design and creative team" },
      { name: "Development Team", description: "Software development and engineering team" },
      { name: "Marketing Team", description: "Marketing, promotion and growth team" },
      { name: "QA Team", description: "Quality assurance and testing team" }
    ];

    const createdTeams = [];
    for (const teamData of sampleTeams) {
      const existingTeam = await Team.findOne({ name: teamData.name });
      if (!existingTeam) {
        const team = new Team(teamData);
        const savedTeam = await team.save();
        createdTeams.push(savedTeam);
      } else {
        createdTeams.push(existingTeam);
      }
    }

    // create sample projects
    const sampleProjects = [
      { name: "Website Redesign", description: "Complete redesign of the company website with modern UI/UX" },
      { name: "Mobile App Development", description: "Native mobile application for iOS and Android platforms" },
      { name: "Marketing Campaign Q1", description: "Comprehensive marketing campaign for Q1 product launch" },
      { name: "API Integration", description: "Integration with third-party APIs and services" },
      { name: "Database Migration", description: "Migration from legacy database to modern cloud solution" }
    ];

    const createdProjects = [];
    for (const projectData of sampleProjects) {
      const existingProject = await Project.findOne({ name: projectData.name });
      if (!existingProject) {
        const project = new Project(projectData);
        const savedProject = await project.save();
        createdProjects.push(savedProject);
      } else {
        createdProjects.push(existingProject);
      }
    }

    // create sample tasks
    const sampleTasks = [
      {
        name: "Create wireframes for homepage",
        projectId: createdProjects[0]._id,
        teamId: createdTeams[0]._id,
        owners: [createdUsers[0]._id],
        tags: ["Design", "Wireframes", "Homepage"],
        timeToComplete: 3,
        status: "In Progress"
      },
      {
        name: "Develop user authentication system",
        projectId: createdProjects[1]._id,
        teamId: createdTeams[1]._id,
        owners: [createdUsers[1]._id, createdUsers[4]._id],
        tags: ["Development", "Authentication", "Security"],
        timeToComplete: 5,
        status: "To Do"
      },
      {
        name: "Design marketing materials",
        projectId: createdProjects[2]._id,
        teamId: createdTeams[2]._id,
        owners: [createdUsers[2]._id],
        tags: ["Marketing", "Design", "Materials"],
        timeToComplete: 2,
        status: "Completed"
      },
      {
        name: "Setup development environment",
        projectId: createdProjects[1]._id,
        teamId: createdTeams[1]._id,
        owners: [createdUsers[1]._id],
        tags: ["Development", "Setup", "Environment"],
        timeToComplete: 1,
        status: "Completed"
      },
      {
        name: "Write API documentation",
        projectId: createdProjects[3]._id,
        teamId: createdTeams[1]._id,
        owners: [createdUsers[4]._id],
        tags: ["Documentation", "API", "Technical"],
        timeToComplete: 4,
        status: "In Progress"
      },
      {
        name: "Test mobile app features",
        projectId: createdProjects[1]._id,
        teamId: createdTeams[3]._id,
        owners: [createdUsers[3]._id],
        tags: ["Testing", "Mobile", "QA"],
        timeToComplete: 3,
        status: "To Do"
      },
      {
        name: "Create brand guidelines",
        projectId: createdProjects[0]._id,
        teamId: createdTeams[0]._id,
        owners: [createdUsers[0]._id, createdUsers[2]._id],
        tags: ["Design", "Branding", "Guidelines"],
        timeToComplete: 2,
        status: "In Progress"
      },
      {
        name: "Database schema design",
        projectId: createdProjects[4]._id,
        teamId: createdTeams[1]._id,
        owners: [createdUsers[4]._id],
        tags: ["Database", "Schema", "Design"],
        timeToComplete: 3,
        status: "Completed"
      }
    ];

    const createdTasks = [];
    for (const taskData of sampleTasks) {
      const task = new Task(taskData);
      const savedTask = await task.save();
      createdTasks.push(savedTask);
    }

    console.log("✅ Sample data created successfully!");
    console.log(`Users: ${createdUsers.length}`);
    console.log(`Teams: ${createdTeams.length}`);
    console.log(`Projects: ${createdProjects.length}`);
    console.log(`Tasks: ${createdTasks.length}`);

    // clear in-memory arrays
    tags.length = 0;

  } catch (error) {
    console.error("Error initializing sample data:", error);
  }
};

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: http://localhost:5173, http://localhost:5174, and http://localhost:5177`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // initialize sample data after server starts
  await initSampleData();
});