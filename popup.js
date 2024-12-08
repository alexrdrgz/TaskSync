document.addEventListener('DOMContentLoaded', function() {
  const taskList = document.getElementById('taskList');
  const addTaskForm = document.getElementById('addTaskForm');
  const addTaskButton = document.getElementById('addTaskButton');
  const closeFormButton = document.getElementById('closeFormButton');
  const addTaskContainer = document.querySelector('.add-task-container');

  function showTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = `
        <div class="card-header" style="background-color: ${getHeaderColor(task.category)}"></div>
        <div class="card-content">
          <div class="card-title-row">
            <h2 class="card-title">${task.title}</h2>
            <button class="complete-task-btn" data-task-id="${task.id}">
              <i class="material-icons">check_circle_outline</i>
            </button>
          </div>
          ${task.notes ? `<p class="card-description">${task.notes}</p>` : ''}
          <div class="button-group">
            <button class="duration-btn button" data-duration="15">15m</button>
            <button class="duration-btn button" data-duration="30">30m</button>
            <button class="duration-btn button" data-duration="60">1h</button>
          </div>
        </div>
      `;

      // Add event listeners for duration buttons
      li.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const duration = parseInt(this.getAttribute('data-duration'));
          addToCalendar(task, duration);
        });
      });

      // Add event listener for complete button
      const completeBtn = li.querySelector('.complete-task-btn');
      completeBtn.addEventListener('click', () => completeTask(task.id));

      taskList.appendChild(li);
    });
  }

  function getHeaderColor(category) {
    switch (category) {
      case 'work':
        return 'var(--blue-500)';
      case 'personal':
        return 'var(--green-500)';
      case 'study':
        return 'var(--yellow-500)';
      default:
        return 'var(--purple-600)';
    }
  }

  function addToCalendar(task, duration) {
    const button = event.currentTarget;
    const originalText = button.innerHTML;
    showLoading(button);

    chrome.runtime.sendMessage({ action: 'addToCalendar', task: task, duration: duration }, function(response) {
      hideLoading(button, originalText);
      if (response.success) {
        const startTime = new Date(response.eventStart);
        const startDate = startTime.toLocaleDateString();
        const startTimeString = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        showSnackbar(`Scheduled for ${startDate} at ${startTimeString}`);
      } else {
        showSnackbar('Failed to add task to calendar: ' + response.error);
      }
    });
  }

  function showSnackbar(message) {
    const snackbar = document.getElementById('snackbar');
    const snackbarMessage = snackbar.querySelector('.snackbar-message');
    snackbarMessage.textContent = message;
    snackbar.classList.remove('no-show');

    setTimeout(() => {
      snackbar.classList.add('no-show');
    }, 3000);
  }

  function fetchTasks() {
    chrome.runtime.sendMessage({ action: 'getTasks' }, function(response) {
      if (chrome.runtime.lastError) {
        taskList.innerHTML = '<li class="mdl-typography--text-center">Failed to fetch tasks: ' + chrome.runtime.lastError.message + '</li>';
        return;
      }

      if (response && response.success) {
        showTasks(response.tasks);
      } else {
        taskList.innerHTML = '<li class="mdl-typography--text-center">Failed to fetch tasks: ' + (response ? response.error : 'Unknown error') + '</li>';
      }
    });
  }

  fetchTasks();

  const settingsButton = document.getElementById('settingsButton');
    
  settingsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
  });

  addTaskForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const submitButton = addTaskForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    showLoading(submitButton);

    const newTask = {
      title: document.getElementById('taskTitle').value,
      notes: document.getElementById('taskNotes').value
    };

    chrome.runtime.sendMessage({ action: 'addTask', task: newTask }, function(response) {
      hideLoading(submitButton, originalText);
      if (chrome.runtime.lastError) {
        showSnackbar('Failed to add task: ' + chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        fetchTasks();
        showSnackbar('Task added successfully');
        addTaskForm.reset();
        addTaskContainer.classList.remove('active');
        addTaskButton.style.display = 'flex';
      } else {
        showSnackbar('Failed to add task: ' + (response ? response.error : 'Unknown error'));
      }
    });
  });

  // Show form when FAB is clicked
  addTaskButton.addEventListener('click', () => {
    addTaskContainer.classList.add('active');
    addTaskButton.style.display = 'none'; // Hide the FAB when form is shown
  });

  // Hide form when close button is clicked
  closeFormButton.addEventListener('click', () => {
    addTaskContainer.classList.remove('active');
    addTaskButton.style.display = 'flex';
  });

  // Add this new function to handle task completion
  function completeTask(taskId) {
    const button = event.currentTarget;
    if (!confirm('Are you sure you want to complete this task?')) {
      return;
    }

    showLoading(button);
    try {
      chrome.runtime.sendMessage({ 
        action: 'completeTask', 
        taskId: taskId 
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          showSnackbar('Failed to complete task: ' + chrome.runtime.lastError.message);
          hideLoading(button, '<i class="material-icons">check_circle_outline</i>');
          return;
        }
        
        if (response && response.success) {
          showSnackbar('Task completed');
          fetchTasks(); // Refresh the task list
        } else {
          showSnackbar('Failed to complete task: ' + (response ? response.error : 'Unknown error'));
          hideLoading(button, '<i class="material-icons">check_circle_outline</i>');
        }
      });
    } catch (error) {
      console.error('Error in completeTask:', error);
      showSnackbar('Failed to complete task: ' + error.message);
      hideLoading(button, '<i class="material-icons">check_circle_outline</i>');
    }
  }

  // Add loading states
  function showLoading(element) {
    element.disabled = true;
    element.innerHTML = '<i class="material-icons rotating">refresh</i>';
  }

  function hideLoading(element, originalText) {
    element.disabled = false;
    element.innerHTML = originalText;
  }

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && addTaskContainer.classList.contains('active')) {
      closeFormButton.click();
    }
  });

  // Add Enter key support for form submission
  document.getElementById('taskTitle').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTaskForm.querySelector('button[type="submit"]').click();
    }
  });
});