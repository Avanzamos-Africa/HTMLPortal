const http = require('http');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const PORT = 3000;
const db = new Database('portal.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`);

// Create admin user if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const adminPassword = hashPassword('admin123');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', adminPassword, 'admin');
}

// Session store
const sessions = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function getSession(sessionId) {
  return sessions.get(sessionId);
}

function createSession(userId, username, role) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, { userId, username, role, createdAt: Date.now() });
  return sessionId;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoints
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // Auth endpoints
      if (url.pathname === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await parseBody(req);
        const hashedPassword = hashPassword(password);
        const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, hashedPassword);
        
        if (user) {
          const sessionId = createSession(user.id, user.username, user.role);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, sessionId, user: { id: user.id, username: user.username, role: user.role } }));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ success: false, message: 'Invalid credentials' }));
        }
        return;
      }
      
      if (url.pathname === '/api/auth/register' && req.method === 'POST') {
        const { username, password } = await parseBody(req);
        
        if (!username || !password || username.length < 3 || password.length < 6) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, message: 'Username must be 3+ chars, password 6+ chars' }));
          return;
        }
        
        try {
          const hashedPassword = hashPassword(password);
          const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, 'user');
          const sessionId = createSession(result.lastInsertRowid, username, 'user');
          res.writeHead(201);
          res.end(JSON.stringify({ success: true, sessionId, user: { id: result.lastInsertRowid, username, role: 'user' } }));
        } catch (err) {
          res.writeHead(409);
          res.end(JSON.stringify({ success: false, message: 'Username already exists' }));
        }
        return;
      }
      
      if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        if (sessionId) {
          deleteSession(sessionId);
        }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }
      
      if (url.pathname === '/api/auth/me' && req.method === 'GET') {
        const sessionId = req.headers.authorization?.replace('Bearer ', '');
        const session = getSession(sessionId);
        
        if (session) {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, user: { id: session.userId, username: session.username, role: session.role } }));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
        }
        return;
      }
      
      // Protected endpoints - require authentication
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const session = getSession(sessionId);
      
      if (!session) {
        res.writeHead(401);
        res.end(JSON.stringify({ success: false, message: 'Not authenticated' }));
        return;
      }
      
      // Tasks endpoints
      if (url.pathname === '/api/tasks' && req.method === 'GET') {
        let tasks;
        if (session.role === 'admin') {
          tasks = db.prepare('SELECT tasks.*, users.username FROM tasks JOIN users ON tasks.user_id = users.id ORDER BY tasks.created_at DESC').all();
        } else {
          tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(session.userId);
        }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, tasks }));
        return;
      }
      
      if (url.pathname === '/api/tasks' && req.method === 'POST') {
        const { title, description, priority } = await parseBody(req);
        
        if (!title || title.trim().length === 0) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, message: 'Title is required' }));
          return;
        }
        
        const result = db.prepare('INSERT INTO tasks (title, description, priority, user_id) VALUES (?, ?, ?, ?)').run(
          title, description || '', priority || 'medium', session.userId
        );
        
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, taskId: result.lastInsertRowid }));
        return;
      }
      
      if (url.pathname.match(/^\/api\/tasks\/\d+$/) && req.method === 'PUT') {
        const taskId = parseInt(url.pathname.split('/').pop());
        const { title, description, status, priority } = await parseBody(req);
        
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        
        if (!task) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, message: 'Task not found' }));
          return;
        }
        
        if (session.role !== 'admin' && task.user_id !== session.userId) {
          res.writeHead(403);
          res.end(JSON.stringify({ success: false, message: 'No permission to edit this task' }));
          return;
        }
        
        db.prepare('UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
          title || task.title,
          description !== undefined ? description : task.description,
          status || task.status,
          priority || task.priority,
          taskId
        );
        
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }
      
      if (url.pathname.match(/^\/api\/tasks\/\d+$/) && req.method === 'DELETE') {
        const taskId = parseInt(url.pathname.split('/').pop());
        
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        
        if (!task) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, message: 'Task not found' }));
          return;
        }
        
        if (session.role !== 'admin' && task.user_id !== session.userId) {
          res.writeHead(403);
          res.end(JSON.stringify({ success: false, message: 'No permission to delete this task' }));
          return;
        }
        
        db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
        
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }
      
      // Users endpoint (admin only)
      if (url.pathname === '/api/users' && req.method === 'GET') {
        if (session.role !== 'admin') {
          res.writeHead(403);
          res.end(JSON.stringify({ success: false, message: 'Admin access required' }));
          return;
        }
        
        const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, users }));
        return;
      }
      
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, message: 'Not found' }));
      
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
    }
    return;
  }
  
  // Serve static files
  let filePath = url.pathname === '/' ? '/public/index.html' : `/public${url.pathname}`;
  filePath = path.join(__dirname, filePath);
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
    } else {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Default admin credentials - username: admin, password: admin123`);
});
