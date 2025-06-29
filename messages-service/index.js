const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

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
  origin: [
    'http://localhost:4321', 
    'http://127.0.0.1:4321',
    'http://192.168.99.100:4321' // <-- AÑADIR ESTA LÍNEA
  ],credentials: true
}));
app.use(express.json());

// Initialize database table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        sender_username VARCHAR(150) NOT NULL,
        receiver_id INTEGER NOT NULL,
        receiver_username VARCHAR(150) NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Messages table initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'messages-service' });
});

// Send a message
app.post('/messages', async (req, res) => {
  try {
    const { sender_id, sender_username, receiver_id, receiver_username, content } = req.body;
    
    if (!sender_id || !sender_username || !receiver_id || !receiver_username || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(`
      INSERT INTO messages (sender_id, sender_username, receiver_id, receiver_username, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, content, created_at
    `, [sender_id, sender_username, receiver_id, receiver_username, content]);

    res.status(201).json({ 
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversations for a user
app.get('/users/:userId/conversations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT DISTINCT 
        CASE 
          WHEN sender_id = $1 THEN receiver_id 
          ELSE sender_id 
        END as other_user_id,
        CASE 
          WHEN sender_id = $1 THEN receiver_username 
          ELSE sender_username 
        END as other_username,
        MAX(created_at) as last_message_time,
        COUNT(CASE WHEN receiver_id = $1 AND is_read = false THEN 1 END) as unread_count
      FROM messages 
      WHERE sender_id = $1 OR receiver_id = $1
      GROUP BY other_user_id, other_username
      ORDER BY last_message_time DESC
    `, [userId]);
    
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages between two users
app.get('/users/:userId1/messages/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    console.log(`Getting messages between user ${userId1} and user ${userId2}`);
    
    const result = await pool.query(`
      SELECT id, sender_id, sender_username, receiver_id, receiver_username, 
             content, is_read, created_at
      FROM messages 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `, [userId1, userId2]);
    
    console.log('Messages found:', result.rows.length);
    console.log('Messages data:', result.rows);
    
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark messages as read
app.put('/users/:userId/messages/:senderId/read', async (req, res) => {
  try {
    const { userId, senderId } = req.params;
    
    await pool.query(`
      UPDATE messages 
      SET is_read = true 
      WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false
    `, [userId, senderId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread message count for a user
app.get('/users/:userId/unread-count', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM messages 
      WHERE receiver_id = $1 AND is_read = false
    `, [userId]);
    
    res.json({ unread_count: parseInt(result.rows[0].unread_count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users by username (integration with user service would be ideal)
app.get('/search-users/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    // For now, return mock data - in production, integrate with user-service
    // You could call: const userResponse = await fetch('http://user-service:3003/search/' + query);
    
    const mockUsers = [
      { id: 1, username: 'usuario1', first_name: 'Usuario', last_name: 'Uno' },
      { id: 2, username: 'usuario2', first_name: 'Usuario', last_name: 'Dos' }
    ].filter(user => user.username.toLowerCase().includes(query.toLowerCase()));
    
    res.json({ users: mockUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message by username (resolve username to ID)
app.post('/messages/by-username', async (req, res) => {
  try {
    const { sender_id, sender_username, receiver_username, content } = req.body;
    
    if (!sender_id || !sender_username || !receiver_username || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Look up the receiver in the user service using internal network
    try {
      const userServiceUrl = 'http://user-service:3003'; // Use internal Docker network
      const response = await fetch(`${userServiceUrl}/search/${receiver_username}`);
      
      if (!response.ok) {
        console.log(`User ${receiver_username} not found in user service`);
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = await response.json();
      const receiver = userData.user;
      
      console.log(`Sending message from ${sender_username} (ID: ${sender_id}) to ${receiver.username} (ID: ${receiver.id})`);

      const result = await pool.query(`
        INSERT INTO messages (sender_id, sender_username, receiver_id, receiver_username, content)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, content, created_at
      `, [sender_id, sender_username, receiver.id, receiver.username, content]);

      res.status(201).json({ 
        success: true,
        message: result.rows[0]
      });
    } catch (fetchError) {
      console.error('Error calling user service:', fetchError);
      return res.status(500).json({ error: 'Error validating user' });
    }
  } catch (error) {
    console.error('Error sending message by username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Messages service running on port ${PORT}`);
  await initDB();
});
