document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup loaded');
  
    document.getElementById('loginButton').addEventListener('click', function() {
      console.log('Login button clicked');
      chrome.runtime.sendMessage({action: 'login'}, function(response) {
        console.log('Login response received:', response);
        if (response) {
          console.log('Login successful');
          // Update UI to show logged in state
        } else {
          console.error('Login failed');
          // Update UI to show login failed
        }
      });
    });
  
    document.getElementById('addTaskButton').addEventListener('click', function() {
      console.log('Add task button clicked');
      const task = {
        name: 'Example Task',
        dueDate: new Date().toISOString()
      };
      chrome.runtime.sendMessage({action: 'addTask', task: task}, function(response) {
        console.log('Add task response received:', response);
        if (response && response.success) {
          console.log('Task added successfully');
          // Update UI to show task added
        } else {
          console.error('Failed to add task:', response ? response.error : 'Unknown error');
          // Update UI to show task addition failed
        }
      });
    });
  });