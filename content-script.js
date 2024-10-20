// console.log('Google Tasks to Calendar: Content script loaded');

// function addDebugElement() {
//   const debugElement = document.createElement('div');
//   debugElement.textContent = 'Tasks to Calendar: Content Script Active';
//   debugElement.style.cssText = `
//     position: fixed;
//     top: 10px;
//     right: 10px;
//     background-color: rgba(0, 0, 255, 0.7);
//     color: white;
//     padding: 5px 10px;
//     border-radius: 5px;
//     z-index: 9999;
//   `;
//   document.body.appendChild(debugElement);
// }

// chrome.runtime.sendMessage({action: 'updateBadge', text: 'ON'});

// function addButtonToTask(taskElement) {
//   if (taskElement.querySelector('.add-to-calendar-btn')) return;

//   taskElement.style.border = '2px solid blue';
//   taskElement.style.margin = '5px 0';
//   taskElement.style.padding = '5px';

//   const button = document.createElement('button');
//   button.textContent = 'Add to Calendar';
//   button.className = 'add-to-calendar-btn VfPpkd-Bz112c-LgbsSe yHy1rc eT1oJ mN1ivc ibUwed BU0ogb';
//   button.style.cssText = `
//     background: none;
//     border: none;
//     color: #1a73e8;
//     cursor: pointer;
//     font-size: 12px;
//     margin-left: 8px;
//     padding: 4px 8px;
//     border-radius: 4px;
//   `;
  
//   button.addEventListener('click', function(e) {
//     e.preventDefault();
//     e.stopPropagation();

//     const task = extractTaskInfo(taskElement);

//     chrome.runtime.sendMessage({action: 'addToCalendar', task: task}, function(response) {
//       if (response && response.success) {
//         alert('Task added to calendar successfully!');
//       } else {
//         alert('Failed to add task to calendar. ' + (response ? response.error : ''));
//       }
//     });
//   });

//   const actionContainer = taskElement.querySelector('.QRxjOc.Uy7FYb') || taskElement.querySelector('.bFUJC');
//   if (actionContainer) {
//     actionContainer.appendChild(button);
//   }
// }

// function extractTaskInfo(taskElement) {
//   const titleElement = taskElement.querySelector('[role="checkbox"]') || taskElement.querySelector('[data-task-id]');
//   const dueDateElement = taskElement.querySelector('[data-task-due-date]') || taskElement.querySelector('[aria-label^="Due"]');
//   const notesElement = taskElement.querySelector('.tasks-notes') || taskElement.querySelector('.Z3zYLb .OyWyib [jsname="ok3btb"]');

//   return {
//     title: titleElement ? (titleElement.getAttribute('aria-label') || titleElement.textContent || 'Untitled Task') : 'Untitled Task',
//     due: dueDateElement ? (dueDateElement.getAttribute('data-task-due-date') || dueDateElement.getAttribute('aria-label')) : null,
//     notes: notesElement ? notesElement.textContent.trim() : '',
//     completed: taskElement.querySelector('button[aria-pressed="true"]') !== null
//   };
// }

// function addButtonsToTasks() {
//   console.log('Attempting to add buttons to tasks');
  
//   const iframe = document.querySelector('iframe[title="Tasks"]');
//   if (!iframe) {
//     console.log('Tasks iframe not found');
//     return false;
//   }

//   iframe.contentWindow.postMessage({action: 'addButtons'}, '*');
//   return true;
// }

// function handleIframeMessage(event) {
//   if (event.data.action === 'tasksReady') {
//     const iframe = document.querySelector('iframe[title="Tasks"]');
//     if (iframe && iframe.contentDocument) {
//       const activeTasksContainer = iframe.contentDocument.querySelector('[aria-label="Active tasks"][role="list"]');
//       if (activeTasksContainer) {
//         const taskElements = activeTasksContainer.querySelectorAll('[role="listitem"]');
//         console.log('Found', taskElements.length, 'task elements');
//         taskElements.forEach(addButtonToTask);
//       }
//     }
//   }
// }

// function observeIframeChanges() {
//   const config = { childList: true, subtree: true };

//   const callback = function(mutationsList, observer) {
//     for (let mutation of mutationsList) {
//       if (mutation.type === 'childList') {
//         const iframe = document.querySelector('iframe[title="Tasks"]');
//         if (iframe) {
//           addButtonsToTasks();
//         }
//       }
//     }
//   };

//   const observer = new MutationObserver(callback);
//   observer.observe(document.body, config);
//   console.log('MutationObserver started');
// }

// function injectScriptToIframe(iframe) {
//   const script = document.createElement('script');
//   script.textContent = `
//     function checkForTasks() {
//       const activeTasksContainer = document.querySelector('[aria-label="Active tasks"][role="list"]');
//       if (activeTasksContainer) {
//         window.parent.postMessage({action: 'tasksReady'}, '*');
//       } else {
//         setTimeout(checkForTasks, 500);
//       }
//     }
//     checkForTasks();

//     window.addEventListener('message', function(event) {
//       if (event.data.action === 'addButtons') {
//         checkForTasks();
//       }
//     });
//   `;
//   iframe.contentDocument.body.appendChild(script);
// }

// function waitForIframe(maxAttempts = 10, interval = 1000) {
//   let attempts = 0;

//   function attempt() {
//     console.log(`Attempt ${attempts + 1} to find iframe`);
//     const iframe = document.querySelector('iframe[title="Tasks"]');
//     if (iframe) {
//       console.log('Iframe found');
//       if (iframe.contentDocument) {
//         injectScriptToIframe(iframe);
//       } else {
//         iframe.onload = () => injectScriptToIframe(iframe);
//       }
//       return;
//     }

//     attempts++;
//     if (attempts < maxAttempts) {
//       setTimeout(attempt, interval * Math.pow(2, attempts));
//     } else {
//       console.log('Max attempts reached. Could not find iframe.');
//     }
//   }

//   attempt();
// }

// addDebugElement();
// observeIframeChanges();
// waitForIframe();
// window.addEventListener('message', handleIframeMessage);

// console.log('Google Tasks to Calendar: Content script setup complete');