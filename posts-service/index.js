const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Middleware
app.use(cors({
  origin: ['http://localhost:4321', 'http://127.0.0.1:4321'],
  credentials: true
}));
app.use(express.json());

// Configure multer for file uploads with correct field name
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Initialize database table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username VARCHAR(150) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_data BYTEA,
        image_name VARCHAR(255),
        image_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Posts table initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'posts-service' });
});

// Get all posts
app.get('/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, user_id, username, title, content, 
             CASE WHEN image_data IS NOT NULL THEN true ELSE false END as has_image,
             created_at, updated_at
      FROM posts 
      ORDER BY created_at DESC
    `);
    
    res.json({ posts: result.rows });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new post - fix field name to match frontend
app.post('/posts', upload.single('imagen'), async (req, res) => {
  try {
    const { user_id, username, titulo, contenido } = req.body;
    
    if (!user_id || !username || !titulo || !contenido) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let imageData = null;
    let imageName = null;
    let imageType = null;

    if (req.file) {
      imageData = req.file.buffer;
      imageName = req.file.originalname;
      imageType = req.file.mimetype;
    }

    const result = await pool.query(`
      INSERT INTO posts (user_id, username, title, content, image_data, image_name, image_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, content, created_at
    `, [user_id, username, titulo, contenido, imageData, imageName, imageType]);

    res.status(201).json({ 
      success: true,
      post: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get post image
app.get('/posts/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT image_data, image_type FROM posts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { image_data, image_type } = result.rows[0];
    res.set('Content-Type', image_type);
    res.send(image_data);
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get posts by user
app.get('/users/:userId/posts', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT id, title, content, 
             CASE WHEN image_data IS NOT NULL THEN true ELSE false END as has_image,
             created_at
      FROM posts 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    res.json({ posts: result.rows });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Posts service running on port ${PORT}`);
  await initDB();
});
