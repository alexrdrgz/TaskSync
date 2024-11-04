document.addEventListener('DOMContentLoaded', function() {
  const taskList = document.getElementById('taskList');

  function showTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'card';
      li.innerHTML = `
        <div class="card-header" style="background-color: ${getHeaderColor(task.category)}"></div>
        <div class="card-content">
          <h2 class="card-title">${task.title}</h2>
          ${task.notes ? `<p class="card-description">${task.notes}</p>` : ''}
          <div class="button-group">
            <button class="duration-btn button" data-duration="15">15m</button>
            <button class="duration-btn button" data-duration="30">30m</button>
            <button class="duration-btn button" data-duration="60">1h</button>
          </div>
        </div>
      `;
      li.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const duration = parseInt(this.getAttribute('data-duration'));
          addToCalendar(task, duration);
        });
      });
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
    chrome.runtime.sendMessage({ action: 'addToCalendar', task: task, duration: duration }, function(response) {
      if (response.success) {
        const startTime = new Date(response.eventStart);
        const endTime = new Date(response.eventEnd);
        const startDate = startTime.toLocaleDateString();
        const startTimeString = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTimeString = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      if (response.success) {
        showTasks(response.tasks);
      } else {
        taskList.innerHTML = '<li class="mdl-typography--text-center">Failed to fetch tasks: ' + response.error + '</li>';
      }
    });
  }

  fetchTasks();

  const settingsButton = document.getElementById('settingsButton');
    
  settingsButton.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
  });
});