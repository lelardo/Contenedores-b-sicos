from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import json
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:4321', 'http://127.0.0.1:4321'], supports_credentials=True)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'db'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB'),
    'user': os.getenv('POSTGRES_USER'),
    'password': os.getenv('POSTGRES_PASSWORD'),
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def init_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                username VARCHAR(150) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        print('Comments table initialized')
    except Exception as e:
        print(f'Error initializing database: {e}')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'comments-service'})

@app.route('/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, user_id, username, content, created_at, updated_at
            FROM comments 
            WHERE post_id = %s
            ORDER BY created_at ASC
        """, (post_id,))
        
        comments = cur.fetchall()
        cur.close()
        conn.close()
        
        # Convert datetime objects to ISO format strings
        for comment in comments:
            comment['created_at'] = comment['created_at'].isoformat()
            comment['updated_at'] = comment['updated_at'].isoformat()
        
        return jsonify({'comments': comments})
    except Exception as e:
        print(f'Error fetching comments: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ['user_id', 'username', 'content']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO comments (post_id, user_id, username, content)
            VALUES (%s, %s, %s, %s)
            RETURNING id, content, created_at
        """, (post_id, data['user_id'], data['username'], data['content']))
        
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        result['created_at'] = result['created_at'].isoformat()
        
        return jsonify({
            'success': True,
            'comment': result
        }), 201
    except Exception as e:
        print(f'Error creating comment: {e}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/users/<int:user_id>/comments', methods=['GET'])
def get_user_comments(user_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, post_id, content, created_at
            FROM comments 
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        
        comments = cur.fetchall()
        cur.close()
        conn.close()
        
        for comment in comments:
            comment['created_at'] = comment['created_at'].isoformat()
        
        return jsonify({'comments': comments})
    except Exception as e:
        print(f'Error fetching user comments: {e}')
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=3002, debug=True)
