document.addEventListener('DOMContentLoaded', function() {
    const loginStatus = document.getElementById('loginStatus');
    const taskList = document.getElementById('taskList');
  
    function showTasks(tasks) {
      taskList.innerHTML = '';
      tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item mdl-card mdl-shadow--2dp';
        li.innerHTML = `
          <div class="mdl-card__title">
            <h2 class="mdl-card__title-text">${task.title}</h2>
          </div>
          ${task.notes ? `<div class="mdl-card__supporting-text">${task.notes}</div>` : ''}
          <div class="mdl-card__actions mdl-card--border">
            <div class="duration-buttons">
              <button class="duration-btn mdl-button mdl-js-button mdl-button--raised mdl-button--colored" data-duration="15">15m</button>
              <button class="duration-btn mdl-button mdl-js-button mdl-button--raised mdl-button--colored" data-duration="30">30m</button>
              <button class="duration-btn mdl-button mdl-js-button mdl-button--raised mdl-button--colored" data-duration="60">1h</button>
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
      componentHandler.upgradeDom();
    }
  
    function addToCalendar(task, duration) {
      chrome.runtime.sendMessage({action: 'addToCalendar', task: task, duration: duration}, function(response) {
        if (response.success) {
          showSnackbar(`Task added to calendar for ${duration} minutes!`);
        } else {
          showSnackbar('Failed to add task to calendar: ' + response.error);
        }
      });
    }
  
    function showSnackbar(message) {
      const snackbarContainer = document.querySelector('#snackbar');
      const data = { message: message, timeout: 2000 };
      snackbarContainer.MaterialSnackbar.showSnackbar(data);
    }
  
    function fetchTasks() {
      chrome.runtime.sendMessage({action: 'getTasks'}, function(response) {
        if (response.success) {
          loginStatus.textContent = 'Logged in';
          showTasks(response.tasks);
        } else {
          loginStatus.textContent = 'Not logged in';
          taskList.innerHTML = '<li class="mdl-typography--text-center">Failed to fetch tasks: ' + response.error + '</li>';
        }
      });
    }
  
    fetchTasks();
  
    // Add a snackbar for notifications
    const snackbarContainer = document.createElement('div');
    snackbarContainer.id = 'snackbar';
    snackbarContainer.className = 'mdl-js-snackbar mdl-snackbar';
    snackbarContainer.innerHTML = `
      <div class="mdl-snackbar__text"></div>
      <button class="mdl-snackbar__action" type="button"></button>
    `;
    document.body.appendChild(snackbarContainer);
    componentHandler.upgradeDom();

    const settingsButton = document.getElementById('settingsButton');
    
    settingsButton.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });
  });