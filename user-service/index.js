const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Session configuration
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Middleware
app.use(cors({
  origin: true, // Permitir cualquier origen
  credentials: true
}));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Initialize database tables
async function initDB() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(150) UNIQUE NOT NULL,
        email VARCHAR(254) UNIQUE NOT NULL,
        first_name VARCHAR(150) NOT NULL,
        last_name VARCHAR(150) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        fecha_nacimiento DATE,
        profile_picture BYTEA,
        profile_picture_name VARCHAR(100),
        profile_picture_type VARCHAR(30),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      ) WITH (OIDS=FALSE);
    `);

    await pool.query(`
      ALTER TABLE user_sessions ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
    `);

    console.log('User service database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// User registration
app.post('/register', upload.single('profile_picture'), async (req, res) => {
  try {
    const { username, email, first_name, last_name, password1, password2, fecha_nacimiento } = req.body;
    
    if (!username || !email || !first_name || !last_name || !password1 || !password2) {
      return res.status(400).json({ 
        success: false,
        errors: { general: ['Missing required fields'] }
      });
    }

    if (password1 !== password2) {
      return res.status(400).json({ 
        success: false,
        errors: { password2: ['Passwords do not match'] }
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        errors: { username: ['Username or email already exists'] }
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password1, saltRounds);

    // Handle profile picture
    let imageData = null;
    let imageName = null;
    let imageType = null;

    if (req.file) {
      imageData = req.file.buffer;
      imageName = req.file.originalname;
      imageType = req.file.mimetype;
    }

    // Create user
    const result = await pool.query(`
      INSERT INTO users (username, email, first_name, last_name, password_hash, fecha_nacimiento, 
                        profile_picture, profile_picture_name, profile_picture_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, username, email, first_name, last_name
    `, [username, email, first_name, last_name, passwordHash, fecha_nacimiento || null, 
        imageData, imageName, imageType]);

    res.status(201).json({ 
      success: true,
      message: `Account created for ${username}!`,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ 
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        fecha_nacimiento: user.fecha_nacimiento,
        has_profile_picture: !!user.profile_picture
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Get user profile (requires authentication)
app.get('/profile', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authenticated' 
      });
    }

    const result = await pool.query(
      'SELECT id, username, email, first_name, last_name, fecha_nacimiento, profile_picture FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        fecha_nacimiento: user.fecha_nacimiento,
        has_profile_picture: !!user.profile_picture
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Get user profile picture
app.get('/profile-picture/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT profile_picture, profile_picture_type FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].profile_picture) {
      return res.status(404).json({ error: 'Profile picture not found' });
    }

    const { profile_picture, profile_picture_type } = result.rows[0];
    res.set('Content-Type', profile_picture_type);
    res.send(profile_picture);
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Error logging out' 
      });
    }
    res.json({ 
      success: true,
      message: 'Logout successful' 
    });
  });
});

// Get user info by ID (for other services)
app.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT id, username, first_name, last_name, profile_picture FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      has_profile_picture: !!user.profile_picture
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search user by username
app.get('/search/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`Searching for user: ${username}`);
    
    const result = await pool.query(
      'SELECT id, username, first_name, last_name FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`User ${username} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    console.log(`Found user:`, user);
    res.json({ user });
  } catch (error) {
    console.error('Error searching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`User service running on port ${PORT}`);
  await initDB();
});
