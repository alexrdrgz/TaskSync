document.addEventListener('DOMContentLoaded', function() {
    const loginStatus = document.getElementById('loginStatus');
    const taskList = document.getElementById('taskList');
  
    function showTasks(tasks) {
      taskList.innerHTML = '';
      tasks.forEach(task => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${task.title}</span>
          <div class="duration-buttons">
            <button class="duration-btn" data-duration="15">15min</button>
            <button class="duration-btn" data-duration="30">30min</button>
            <button class="duration-btn" data-duration="60">1hour</button>
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
  
    function addToCalendar(task, duration) {
      chrome.runtime.sendMessage({action: 'addToCalendar', task: task, duration: duration}, function(response) {
        if (response.success) {
          alert(`Task added to calendar successfully for ${duration} minutes!`);
        } else {
          alert('Failed to add task to calendar: ' + response.error);
        }
      });
    }
  
    function fetchTasks() {
      chrome.runtime.sendMessage({action: 'getTasks'}, function(response) {
        if (response.success) {
          loginStatus.textContent = 'Logged in';
          showTasks(response.tasks);
        } else {
          loginStatus.textContent = 'Not logged in';
          taskList.innerHTML = '<li>Failed to fetch tasks: ' + response.error + '</li>';
        }
      });
    }
  
    fetchTasks();
  });