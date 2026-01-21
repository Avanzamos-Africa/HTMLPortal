# HTMLPortal

A monolithic web portal built with **pure HTML, CSS, and JavaScript** featuring CRUD operations, authentication, authorization, and permissions.

## Features

- ✅ **Pure HTML/CSS/JS Frontend** - No frameworks or libraries
- ✅ **CRUD Operations** - Create, Read, Update, Delete tasks
- ✅ **Authentication** - Login and registration system
- ✅ **Authorization** - Role-based access (Admin/User)
- ✅ **Permissions** - Users can only edit their own tasks, admins can edit all
- ✅ **SQLite Database** - Fast, embedded database
- ✅ **Modern UI** - Black on white theme with modern sans-serif typography
- ✅ **Optimized Performance** - Fast load times with minimal dependencies

## Tech Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js (minimal HTTP server)
- **Database**: SQLite3 (better-sqlite3)
- **Authentication**: Session-based with SHA-256 password hashing

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Avanzamos-Africa/HTMLPortal.git
cd HTMLPortal
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Default Credentials

- **Username**: admin
- **Password**: admin123
- **Role**: admin

## User Roles & Permissions

### User Role
- View own tasks
- Create new tasks
- Edit own tasks
- Delete own tasks

### Admin Role
- View all tasks (from all users)
- Create tasks
- Edit any task
- Delete any task
- View user statistics

## Project Structure

```
HTMLPortal/
├── public/              # Frontend files
│   ├── index.html       # Login/Register page
│   ├── dashboard.html   # Task dashboard
│   ├── style.css        # Styles (black-on-white theme)
│   ├── app.js           # Auth logic
│   └── dashboard.js     # Dashboard logic
├── server.js            # Node.js backend server
├── package.json         # Dependencies
└── portal.db            # SQLite database (created on first run)
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - Get all tasks (filtered by user role)
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Admin
- `GET /api/users` - Get all users (admin only)

## Design Principles

1. **Minimal & Fast**: No heavy frameworks, pure vanilla JavaScript
2. **Clean Typography**: Modern sans-serif fonts with proper spacing
3. **Accessible**: Semantic HTML, proper form labels, keyboard navigation
4. **Responsive**: Works on desktop, tablet, and mobile devices
5. **Secure**: Password hashing, session management, permission checks

## Security Features

- SHA-256 password hashing
- Session-based authentication
- Authorization middleware
- Permission checks on all operations
- Input validation
- XSS protection through HTML escaping

## Performance Optimizations

- Minimal HTTP requests
- No external dependencies on frontend
- Indexed database queries
- Efficient DOM updates
- CSS-only animations
