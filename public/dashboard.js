// Dashboard state
let allTasks = [];
let currentFilter = 'all';
let editingTaskId = null;

// Initialize dashboard
async function initDashboard() {
  const sessionId = getSessionId();
  if (!sessionId) {
    window.location.href = '/';
    return;
  }
  
  try {
    const data = await apiCall('/auth/me');
    if (data.success) {
      setUser(data.user);
      displayUserInfo(data.user);
      await loadTasks();
      if (data.user.role === 'admin') {
        await loadAdminData();
      }
    }
  } catch (err) {
    console.error('Init error:', err);
    window.location.href = '/';
  }
}

function displayUserInfo(user) {
  document.getElementById('username-display').textContent = user.username;
  const roleBadge = document.getElementById('role-badge');
  roleBadge.textContent = user.role;
  roleBadge.className = `badge role-${user.role}`;
}

async function loadAdminData() {
  try {
    const adminSection = document.getElementById('admin-section');
    adminSection.style.display = 'block';
    
    const usersData = await apiCall('/users');
    document.getElementById('total-users').textContent = usersData.users.length;
    document.getElementById('total-tasks').textContent = allTasks.length;
  } catch (err) {
    console.error('Error loading admin data:', err);
  }
}

async function loadTasks() {
  try {
    const data = await apiCall('/tasks');
    if (data.success) {
      allTasks = data.tasks;
      displayTasks();
    }
  } catch (err) {
    console.error('Error loading tasks:', err);
    showError('Failed to load tasks');
  }
}

function displayTasks() {
  const container = document.getElementById('tasks-container');
  const emptyState = document.getElementById('empty-state');
  const user = getUser();
  
  let filteredTasks = allTasks;
  if (currentFilter !== 'all') {
    filteredTasks = allTasks.filter(task => task.status === currentFilter);
  }
  
  if (filteredTasks.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  container.innerHTML = filteredTasks.map(task => {
    const isOwner = task.user_id === user.id;
    const canEdit = user.role === 'admin' || isOwner;
    
    return `
      <div class="task-card" data-task-id="${task.id}">
        <div class="task-header">
          <div>
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${task.username ? `<div class="task-owner">Created by ${escapeHtml(task.username)}</div>` : ''}
          </div>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge status-${task.status}">${task.status}</span>
          <span class="badge priority-${task.priority}">${task.priority}</span>
        </div>
        ${canEdit ? `
        <div class="task-actions">
          <button class="btn btn-secondary" onclick="editTask(${task.id})">Edit</button>
          <button class="btn btn-danger" onclick="deleteTask(${task.id})">Delete</button>
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function filterTasks(status) {
  currentFilter = status;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`.filter-btn[data-status="${status}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  displayTasks();
}

function showCreateModal() {
  editingTaskId = null;
  document.getElementById('modal-title').textContent = 'Create Task';
  document.getElementById('task-form').reset();
  document.getElementById('task-status').value = 'pending';
  document.getElementById('task-modal').style.display = 'flex';
}

function editTask(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;
  
  editingTaskId = taskId;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('task-modal').style.display = 'none';
  editingTaskId = null;
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const priority = document.getElementById('task-priority').value;
  const status = document.getElementById('task-status').value;
  
  try {
    if (editingTaskId) {
      await apiCall(`/tasks/${editingTaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description, priority, status })
      });
    } else {
      await apiCall('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description, priority })
      });
    }
    
    closeModal();
    await loadTasks();
  } catch (err) {
    alert(err.message || 'Operation failed');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }
  
  try {
    await apiCall(`/tasks/${taskId}`, { method: 'DELETE' });
    await loadTasks();
  } catch (err) {
    alert(err.message || 'Delete failed');
  }
}

// Close modal when clicking outside
document.addEventListener('click', (event) => {
  const modal = document.getElementById('task-modal');
  if (event.target === modal) {
    closeModal();
  }
});

// Initialize on page load
if (window.location.pathname === '/dashboard.html') {
  initDashboard();
}
