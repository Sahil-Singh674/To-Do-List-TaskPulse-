/**
 * TaskPulse - Modern Interactive To-Do List Application
 * Features: LocalStorage sync, Web Audio effects, Canvas Confetti,
 * Subtasks, Filter & Sorting, Search, Theme Switching, and Backup/Restore.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. Initial State & Configuration
  // ==========================================
  const STORAGE_KEY_TASKS = 'taskpulse_tasks';
  const STORAGE_KEY_THEME = 'taskpulse_theme';
  const STORAGE_KEY_SOUND = 'taskpulse_sound';

  // Sample tasks for first time visitors
  const DEFAULT_TASKS = [
    {
      id: 'task-sample-1',
      title: 'Finish project documentation & review architecture',
      description: 'Review system design, update README, and prepare slide deck.',
      category: 'Work',
      priority: 'high',
      dueDate: new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16),
      completed: false,
      completedAt: null,
      createdAt: Date.now() - 100000,
      subtasks: [
        { id: 'sub-1-1', text: 'Outline key sections', completed: true },
        { id: 'sub-1-2', text: 'Write user workflow walkthrough', completed: true },
        { id: 'sub-1-3', text: 'Proofread & verify code links', completed: false }
      ]
    },
    {
      id: 'task-sample-2',
      title: 'Weekly grocery shopping',
      description: 'Pick up organic vegetables, milk, almond butter, and coffee beans.',
      category: 'Shopping',
      priority: 'medium',
      dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
      completed: false,
      completedAt: null,
      createdAt: Date.now() - 80000,
      subtasks: [
        { id: 'sub-2-1', text: 'Fresh fruits & spinach', completed: false },
        { id: 'sub-2-2', text: 'Dark roast coffee', completed: false }
      ]
    },
    {
      id: 'task-sample-3',
      title: 'Morning 20-minute run and stretching',
      description: 'Cardio workout in the park followed by full body stretching.',
      category: 'Health',
      priority: 'low',
      dueDate: new Date().toISOString().slice(0, 16),
      completed: true,
      completedAt: Date.now() - 3600000,
      createdAt: Date.now() - 150000,
      subtasks: []
    }
  ];

  let tasks = [];
  let currentFilter = 'all';
  let currentCategory = 'all';
  let currentSort = 'created-desc';
  let searchQuery = '';
  let draftSubtasks = [];
  let editDraftSubtasks = [];
  let soundEnabled = true;
  let undoTimeout = null;
  let deletedTaskBackup = null;

  // ==========================================
  // 2. DOM Elements
  // ==========================================
  const currentDateEl = document.getElementById('current-date');
  const toggleThemeBtn = document.getElementById('toggle-theme-btn');
  const toggleSoundBtn = document.getElementById('toggle-sound-btn');
  const dataMenuBtn = document.getElementById('data-menu-btn');
  const dataMenu = document.getElementById('data-menu');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonInput = document.getElementById('import-json-input');
  const clearAllBtn = document.getElementById('clear-all-btn');

  // Stats Elements
  const progressCircle = document.getElementById('progress-circle');
  const progressText = document.getElementById('progress-text');
  const progressRatio = document.getElementById('progress-ratio');
  const statPending = document.getElementById('stat-pending');
  const statCompleted = document.getElementById('stat-completed');
  const statOverdue = document.getElementById('stat-overdue');

  // Form Elements
  const taskForm = document.getElementById('task-form');
  const taskTitleInput = document.getElementById('task-title');
  const toggleDetailsBtn = document.getElementById('toggle-details-btn');
  const detailsBtnText = document.getElementById('details-btn-text');
  const formDetails = document.getElementById('form-details');
  const taskDescInput = document.getElementById('task-desc');
  const taskCategoryInput = document.getElementById('task-category');
  const taskPriorityInput = document.getElementById('task-priority');
  const taskDueInput = document.getElementById('task-due');
  const newSubtaskInput = document.getElementById('new-subtask-input');
  const addSubtaskBtn = document.getElementById('add-subtask-btn');
  const draftSubtasksList = document.getElementById('draft-subtasks-list');

  // Controls Elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const filterCategorySelect = document.getElementById('filter-category');
  const sortTasksSelect = document.getElementById('sort-tasks');

  // Task List
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const currentViewTitle = document.getElementById('current-view-title');
  const taskCountBadge = document.getElementById('task-count-badge');

  // Modal Elements
  const editModal = document.getElementById('edit-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const editTaskForm = document.getElementById('edit-task-form');
  const editTaskId = document.getElementById('edit-task-id');
  const editTaskTitle = document.getElementById('edit-task-title');
  const editTaskDesc = document.getElementById('edit-task-desc');
  const editTaskCategory = document.getElementById('edit-task-category');
  const editTaskPriority = document.getElementById('edit-task-priority');
  const editTaskDue = document.getElementById('edit-task-due');
  const editSubtaskInput = document.getElementById('edit-subtask-input');
  const editAddSubtaskBtn = document.getElementById('edit-add-subtask-btn');
  const editSubtasksList = document.getElementById('edit-subtasks-list');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // Confetti Canvas
  const confettiCanvas = document.getElementById('confetti-canvas');
  const confettiCtx = confettiCanvas.getContext('2d');

  // ==========================================
  // 3. Web Audio Synthesis
  // ==========================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      if (type === 'complete') {
        // Cheerful dual harmonic chime (C6 to E6)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

        osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22); // C6

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
      } else if (type === 'pop') {
        // Short subtle click
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'delete') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // ==========================================
  // 4. Canvas Confetti System
  // ==========================================
  let confettiParticles = [];
  let confettiAnimationId = null;

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfettiCanvas);
  resizeConfettiCanvas();

  function triggerConfetti() {
    confettiParticles = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];
    const particleCount = 70;

    for (let i = 0; i < particleCount; i++) {
      confettiParticles.push({
        x: confettiCanvas.width / 2 + (Math.random() * 200 - 100),
        y: confettiCanvas.height * 0.35 + (Math.random() * 80 - 40),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 7 + 5,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() * -10) - 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        gravity: 0.28,
        drag: 0.96
      });
    }

    if (!confettiAnimationId) {
      animateConfetti();
    }
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.vx *= p.drag;
      p.vy = (p.vy * p.drag) + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.008;

      if (p.opacity <= 0 || p.y > confettiCanvas.height) {
        confettiParticles.splice(i, 1);
        continue;
      }

      confettiCtx.save();
      confettiCtx.globalAlpha = Math.max(0, p.opacity);
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      confettiCtx.restore();
    }

    if (confettiParticles.length > 0) {
      confettiAnimationId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiAnimationId = null;
    }
  }

  // ==========================================
  // 5. State Management & Storage
  // ==========================================
  function loadTasks() {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) {
      try {
        tasks = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse tasks from storage', e);
        tasks = DEFAULT_TASKS;
      }
    } else {
      tasks = DEFAULT_TASKS;
      saveTasks();
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    updateStats();
    renderTasks();
  }

  function generateId(prefix = 'task') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  }

  // ==========================================
  // 6. Theme & Settings
  // ==========================================
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY_THEME, next);
    updateThemeIcon(next);
    playSound('pop');
  }

  function updateThemeIcon(theme) {
    const icon = toggleThemeBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      toggleThemeBtn.title = 'Switch to Light Mode';
    } else {
      icon.className = 'fa-solid fa-moon';
      toggleThemeBtn.title = 'Switch to Dark Mode';
    }
  }

  function initSound() {
    const saved = localStorage.getItem(STORAGE_KEY_SOUND);
    soundEnabled = saved !== null ? saved === 'true' : true;
    updateSoundIcon();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(STORAGE_KEY_SOUND, soundEnabled);
    updateSoundIcon();
    if (soundEnabled) playSound('complete');
  }

  function updateSoundIcon() {
    const icon = toggleSoundBtn.querySelector('i');
    if (soundEnabled) {
      icon.className = 'fa-solid fa-volume-high';
      toggleSoundBtn.title = 'Sound Effects: On';
    } else {
      icon.className = 'fa-solid fa-volume-xmark';
      toggleSoundBtn.title = 'Sound Effects: Muted';
    }
  }

  function renderCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString(undefined, options);
  }

  // ==========================================
  // 7. Stats Calculation & Progress Ring
  // ==========================================
  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    // Check overdue tasks (due date before right now, and not completed)
    const now = new Date();
    const overdue = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      return new Date(t.dueDate) < now;
    }).length;

    statPending.textContent = pending;
    statCompleted.textContent = completed;
    statOverdue.textContent = overdue;
    progressRatio.textContent = `${completed} / ${total} Done`;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressText.textContent = `${percentage}%`;

    // Circumference = 2 * PI * 28 ≈ 175.92
    const circumference = 175.92;
    const offset = circumference - (circumference * percentage) / 100;
    progressCircle.style.strokeDashoffset = offset;
  }

  // ==========================================
  // 8. Task Filtering & Sorting
  // ==========================================
  function getFilteredAndSortedTasks() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return tasks.filter(task => {
      // 1. Status Filter Tab
      if (currentFilter === 'today') {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        if (due < startOfToday || due > endOfToday) return false;
      } else if (currentFilter === 'pending') {
        if (task.completed) return false;
      } else if (currentFilter === 'completed') {
        if (!task.completed) return false;
      } else if (currentFilter === 'overdue') {
        if (task.completed || !task.dueDate) return false;
        if (new Date(task.dueDate) >= now) return false;
      }

      // 2. Category Filter
      if (currentCategory !== 'all' && task.category !== currentCategory) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        const matchSub = (task.subtasks || []).some(s => s.text.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchSub) return false;
      }

      return true;
    }).sort((a, b) => {
      // Completed tasks sink to the bottom unless viewing "completed" tab
      if (currentFilter !== 'completed') {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
      }

      switch (currentSort) {
        case 'created-asc':
          return a.createdAt - b.createdAt;
        case 'created-desc':
          return b.createdAt - a.createdAt;
        case 'due-asc':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'priority-desc': {
          const weights = { high: 3, medium: 2, low: 1 };
          return weights[b.priority] - weights[a.priority];
        }
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }

  // ==========================================
  // 9. Task Card Rendering
  // ==========================================
  function renderTasks() {
    const filteredTasks = getFilteredAndSortedTasks();
    taskList.innerHTML = '';

    // Update view title and counter
    const filterNames = {
      all: 'All Tasks',
      today: "Today's Tasks",
      pending: 'Pending Tasks',
      overdue: 'Overdue Tasks',
      completed: 'Completed Tasks'
    };
    currentViewTitle.textContent = filterNames[currentFilter] || 'Tasks';
    taskCountBadge.textContent = `${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}`;

    if (filteredTasks.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    } else {
      emptyState.classList.add('hidden');
    }

    filteredTasks.forEach(task => {
      const card = createTaskCardElement(task);
      taskList.appendChild(card);
    });
  }

  function formatDueDateDisplay(dueDateStr, isCompleted) {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();

    const isToday = due.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = due.toDateString() === tomorrow.toDateString();

    const timeStr = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let label = '';
    let statusClass = '';

    if (!isCompleted && due < now) {
      label = `Overdue (${due.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr})`;
      statusClass = 'due-overdue';
    } else if (isToday) {
      label = `Today at ${timeStr}`;
      statusClass = 'due-today';
    } else if (isTomorrow) {
      label = `Tomorrow at ${timeStr}`;
    } else {
      label = `${due.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    }

    return { label, statusClass };
  }

  function createTaskCardElement(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    card.dataset.id = task.id;

    // Subtasks summary
    const totalSub = (task.subtasks || []).length;
    const completedSub = (task.subtasks || []).filter(s => s.completed).length;
    const subPercent = totalSub === 0 ? 0 : Math.round((completedSub / totalSub) * 100);

    // Due date format
    const dueInfo = formatDueDateDisplay(task.dueDate, task.completed);

    // Category emoji & title
    const categoryIcons = {
      General: '📌',
      Work: '💼',
      Personal: '👤',
      Study: '📚',
      Health: '🏃',
      Finance: '💰',
      Shopping: '🛒'
    };
    const catEmoji = categoryIcons[task.category] || '🏷️';

    card.innerHTML = `
      <div class="task-card-header">
        <label class="checkbox-container" title="Mark as ${task.completed ? 'Pending' : 'Completed'}">
          <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        <div class="task-card-content">
          <h4 class="task-card-title">${escapeHtml(task.title)}</h4>
          ${task.description ? `<p class="task-card-desc">${escapeHtml(task.description)}</p>` : ''}
        </div>
        <div class="task-card-actions">
          <button class="action-btn edit-task-btn" title="Edit Task">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="action-btn delete-btn delete-task-btn" title="Delete Task">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>

      <div class="task-card-meta">
        <span class="tag tag-priority-${task.priority}">
          <i class="fa-solid fa-flag"></i> ${capitalize(task.priority)}
        </span>
        <span class="tag tag-category">
          ${catEmoji} ${task.category || 'General'}
        </span>
        ${dueInfo ? `
          <span class="tag tag-due ${dueInfo.statusClass}">
            <i class="fa-regular fa-calendar"></i> ${dueInfo.label}
          </span>
        ` : ''}
      </div>

      ${totalSub > 0 ? `
        <div class="task-subtasks-wrapper">
          <div class="subtasks-progress-header">
            <span>Subtasks (${completedSub}/${totalSub})</span>
            <span>${subPercent}%</span>
          </div>
          <div class="subtasks-bar-bg">
            <div class="subtasks-bar-fill" style="width: ${subPercent}%"></div>
          </div>
          <ul class="subtasks-items-list">
            ${task.subtasks.map(s => `
              <li class="subtask-item ${s.completed ? 'completed' : ''}" data-sub-id="${s.id}">
                <input type="checkbox" class="subtask-checkbox" ${s.completed ? 'checked' : ''}>
                <span>${escapeHtml(s.text)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    // Event Listeners for Card elements
    const checkbox = card.querySelector('.task-check');
    checkbox.addEventListener('change', () => toggleTaskComplete(task.id));

    const editBtn = card.querySelector('.edit-task-btn');
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const deleteBtn = card.querySelector('.delete-task-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    // Subtask checkboxes
    const subtaskCheckboxes = card.querySelectorAll('.subtask-checkbox');
    subtaskCheckboxes.forEach(sc => {
      sc.addEventListener('change', (e) => {
        const subId = e.target.closest('.subtask-item').dataset.subId;
        toggleSubtask(task.id, subId);
      });
    });

    return card;
  }

  // ==========================================
  // 10. CRUD Operations
  // ==========================================
  function addTask(title, desc, category, priority, dueDate, subtasksList) {
    const newTask = {
      id: generateId('task'),
      title: title.trim(),
      description: desc.trim(),
      category: category || 'General',
      priority: priority || 'medium',
      dueDate: dueDate || '',
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
      subtasks: subtasksList.map(item => ({
        id: generateId('sub'),
        text: item.text,
        completed: false
      }))
    };

    tasks.unshift(newTask);
    saveTasks();
    playSound('pop');
    showToast('Task added successfully!');
  }

  function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;

    if (task.completed) {
      playSound('complete');
      triggerConfetti();
    } else {
      playSound('pop');
    }

    saveTasks();
  }

  function toggleSubtask(taskId, subtaskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return;

    const sub = task.subtasks.find(s => s.id === subtaskId);
    if (!sub) return;

    sub.completed = !sub.completed;
    playSound('pop');

    // Auto-check task if all subtasks completed
    const allDone = task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
    if (allDone && !task.completed) {
      task.completed = true;
      task.completedAt = Date.now();
      playSound('complete');
      triggerConfetti();
    }

    saveTasks();
  }

  function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    deletedTaskBackup = {
      task: tasks[taskIndex],
      index: taskIndex
    };

    tasks.splice(taskIndex, 1);
    saveTasks();
    playSound('delete');

    showUndoToast('Task deleted', () => {
      if (deletedTaskBackup) {
        tasks.splice(deletedTaskBackup.index, 0, deletedTaskBackup.task);
        deletedTaskBackup = null;
        saveTasks();
        playSound('pop');
        showToast('Task restored!');
      }
    });
  }

  function clearAllTasks() {
    if (tasks.length === 0) return;
    if (confirm('Are you sure you want to delete all tasks? This action cannot be undone.')) {
      tasks = [];
      saveTasks();
      playSound('delete');
      showToast('All tasks cleared.');
    }
  }

  // ==========================================
  // 11. Modal & Editing
  // ==========================================
  function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    editTaskId.value = task.id;
    editTaskTitle.value = task.title;
    editTaskDesc.value = task.description || '';
    editTaskCategory.value = task.category || 'General';
    editTaskPriority.value = task.priority || 'medium';
    editTaskDue.value = task.dueDate || '';

    editDraftSubtasks = (task.subtasks || []).map(s => ({ ...s }));
    renderEditSubtasks();

    editModal.classList.remove('hidden');
    editTaskTitle.focus();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
    editDraftSubtasks = [];
  }

  function renderEditSubtasks() {
    editSubtasksList.innerHTML = '';
    editDraftSubtasks.forEach((sub, idx) => {
      const li = document.createElement('li');
      li.className = 'draft-subtask-item';
      li.innerHTML = `
        <span>${escapeHtml(sub.text)}</span>
        <button type="button" class="remove-draft-subtask" title="Remove subtask" data-idx="${idx}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      li.querySelector('.remove-draft-subtask').addEventListener('click', () => {
        editDraftSubtasks.splice(idx, 1);
        renderEditSubtasks();
      });
      editSubtasksList.appendChild(li);
    });
  }

  // ==========================================
  // 12. Draft Subtasks in Creation Form
  // ==========================================
  function renderDraftSubtasks() {
    draftSubtasksList.innerHTML = '';
    draftSubtasks.forEach((sub, idx) => {
      const li = document.createElement('li');
      li.className = 'draft-subtask-item';
      li.innerHTML = `
        <span>${escapeHtml(sub.text)}</span>
        <button type="button" class="remove-draft-subtask" title="Remove" data-idx="${idx}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      li.querySelector('.remove-draft-subtask').addEventListener('click', () => {
        draftSubtasks.splice(idx, 1);
        renderDraftSubtasks();
      });
      draftSubtasksList.appendChild(li);
    });
  }

  function addDraftSubtask() {
    const text = newSubtaskInput.value.trim();
    if (!text) return;
    draftSubtasks.push({ text });
    newSubtaskInput.value = '';
    renderDraftSubtasks();
    newSubtaskInput.focus();
  }

  // ==========================================
  // 13. Toast Notifications
  // ==========================================
  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showUndoToast(message, onUndo, duration = 5000) {
    if (undoTimeout) clearTimeout(undoTimeout);

    // Clear existing toasts
    toastContainer.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button class="toast-undo-btn">Undo</button>
    `;

    const undoBtn = toast.querySelector('.toast-undo-btn');
    undoBtn.addEventListener('click', () => {
      onUndo();
      toast.remove();
      if (undoTimeout) clearTimeout(undoTimeout);
    });

    toastContainer.appendChild(toast);

    undoTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ==========================================
  // 14. Export & Import JSON Backup
  // ==========================================
  function exportTasksJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `taskpulse-backup-${dateStamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Tasks exported to JSON file!');
  }

  function importTasksJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (!Array.isArray(imported)) {
          alert('Invalid backup file format. Expected a JSON array of tasks.');
          return;
        }

        if (confirm(`Import ${imported.length} tasks? This will merge with your existing tasks.`)) {
          // Merge unique tasks
          const existingIds = new Set(tasks.map(t => t.id));
          imported.forEach(t => {
            if (!t.id || existingIds.has(t.id)) {
              t.id = generateId('task');
            }
            tasks.push(t);
          });

          saveTasks();
          playSound('complete');
          showToast(`Successfully imported ${imported.length} tasks!`);
        }
      } catch (err) {
        alert('Failed to parse the backup file: ' + err.message);
      }
      e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  }

  // ==========================================
  // 15. Helper Utilities
  // ==========================================
  function escapeHtml(string) {
    const div = document.createElement('div');
    div.textContent = string || '';
    return div.innerHTML;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ==========================================
  // 16. Event Listeners Setup
  // ==========================================
  function setupEventListeners() {
    // Theme & Sound
    toggleThemeBtn.addEventListener('click', toggleTheme);
    toggleSoundBtn.addEventListener('click', toggleSound);

    // Settings Dropdown
    dataMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dataMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!dataMenu.contains(e.target) && e.target !== dataMenuBtn) {
        dataMenu.classList.remove('show');
      }
    });

    exportJsonBtn.addEventListener('click', () => {
      dataMenu.classList.remove('show');
      exportTasksJSON();
    });

    importJsonInput.addEventListener('change', (e) => {
      dataMenu.classList.remove('show');
      importTasksJSON(e);
    });

    clearAllBtn.addEventListener('click', () => {
      dataMenu.classList.remove('show');
      clearAllTasks();
    });

    // Form Details Toggle
    toggleDetailsBtn.addEventListener('click', () => {
      const isCollapsed = formDetails.classList.contains('collapsed');
      if (isCollapsed) {
        formDetails.classList.remove('collapsed');
        toggleDetailsBtn.parentElement.classList.add('expanded');
        detailsBtnText.textContent = 'Hide Details';
      } else {
        formDetails.classList.add('collapsed');
        toggleDetailsBtn.parentElement.classList.remove('expanded');
        detailsBtnText.textContent = 'Add Details (Due date, priority, category)';
      }
    });

    // Draft Subtask additions
    addSubtaskBtn.addEventListener('click', addDraftSubtask);
    newSubtaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addDraftSubtask();
      }
    });

    // Main Form Submit
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = taskTitleInput.value.trim();
      if (!title) return;

      const desc = taskDescInput.value;
      const category = taskCategoryInput.value;
      const priority = taskPriorityInput.value;
      const due = taskDueInput.value;

      addTask(title, desc, category, priority, due, draftSubtasks);

      // Reset form
      taskTitleInput.value = '';
      taskDescInput.value = '';
      taskPriorityInput.value = 'medium';
      taskCategoryInput.value = 'General';
      taskDueInput.value = '';
      draftSubtasks = [];
      renderDraftSubtasks();

      // Collapse details if open
      formDetails.classList.add('collapsed');
      toggleDetailsBtn.parentElement.classList.remove('expanded');
      detailsBtnText.textContent = 'Add Details (Due date, priority, category)';
      taskTitleInput.focus();
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchQuery.trim() !== '') {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
      renderTasks();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderTasks();
      searchInput.focus();
    });

    // Filter Tabs
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderTasks();
      });
    });

    // Category Filter
    filterCategorySelect.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      renderTasks();
    });

    // Sort Select
    sortTasksSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderTasks();
    });

    // Edit Modal Events
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    editAddSubtaskBtn.addEventListener('click', () => {
      const text = editSubtaskInput.value.trim();
      if (!text) return;
      editDraftSubtasks.push({
        id: generateId('sub'),
        text,
        completed: false
      });
      editSubtaskInput.value = '';
      renderEditSubtasks();
      editSubtaskInput.focus();
    });

    editSubtaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        editAddSubtaskBtn.click();
      }
    });

    editTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = editTaskId.value;
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      task.title = editTaskTitle.value.trim();
      task.description = editTaskDesc.value.trim();
      task.category = editTaskCategory.value;
      task.priority = editTaskPriority.value;
      task.dueDate = editTaskDue.value;
      task.subtasks = editDraftSubtasks;

      saveTasks();
      closeEditModal();
      playSound('pop');
      showToast('Task updated successfully!');
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') {
        if (!editModal.classList.contains('hidden')) {
          closeEditModal();
        }
        if (dataMenu.classList.contains('show')) {
          dataMenu.classList.remove('show');
        }
      }
    });
  }

  // ==========================================
  // 17. Initialization
  // ==========================================
  function init() {
    renderCurrentDate();
    initTheme();
    initSound();
    loadTasks();
    setupEventListeners();
  }

  // Kick off application on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
