// File: content.js
function addButtonToTask(taskElement) {
    if (taskElement.querySelector('.add-to-calendar-btn')) return;
    
    const button = document.createElement('button');
    button.textContent = '📅';
    button.className = 'add-to-calendar-btn';
    button.style.marginLeft = '10px';
    button.onclick = () => addTaskToCalendar(taskElement);
    
    taskElement.querySelector('.task-name').appendChild(button);
  }
  
  function addTaskToCalendar(taskElement) {
    const taskName = taskElement.querySelector('.task-name-text').textContent;
    const dueDate = taskElement.querySelector('.task-due-date')?.textContent;
    
    chrome.runtime.sendMessage({
      action: 'addToCalendar',
      task: { name: taskName, dueDate: dueDate }
    }, response => {
      if (response.success) {
        alert('Task added to calendar!');
      } else {
        alert('Failed to add task to calendar. Please try again.');
      }
    });
  }
  
  const observer = new MutationObserver(mutations => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('task')) {
          addButtonToTask(node);
        }
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Existing tasks
  document.querySelectorAll('.task').forEach(addButtonToTask);
  