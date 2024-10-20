document.addEventListener('DOMContentLoaded', function() {
    const loginStatus = document.getElementById('loginStatus');
    const taskList = document.getElementById('taskList');
  
    function showTasks(tasks) {
      taskList.innerHTML = '';
      tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = task.title;
        const button = document.createElement('button');
        button.textContent = 'Add to Calendar';
        button.addEventListener('click', function() {
          chrome.runtime.sendMessage({action: 'addToCalendar', task: task}, function(response) {
            if (response.success) {
              alert('Task added to calendar successfully!');
            } else {
              alert('Failed to add task to calendar: ' + response.error);
            }
          });
        });
        li.appendChild(button);
        taskList.appendChild(li);
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