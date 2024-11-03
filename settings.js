document.addEventListener('DOMContentLoaded', function() {
    const settingsForm = document.getElementById('settingsForm');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const dayCheckboxes = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => document.getElementById(day));
    const snackbar = document.getElementById('snackbar');
  
    // Load saved settings
    chrome.storage.sync.get(['workDays', 'workStartTime', 'workEndTime'], function(result) {
      if (result.workDays) {
        result.workDays.forEach((day, index) => {
          dayCheckboxes[index].checked = day;
          dayCheckboxes[index].parentElement.classList.toggle('is-checked', day);
        });
      } else {
        // Default to Monday-Friday if no settings are saved
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
          document.getElementById(day).checked = true;
          document.getElementById(day).parentElement.classList.add('is-checked');
        });
      }
      startTimeInput.value = result.workStartTime || '09:00';
      endTimeInput.value = result.workEndTime || '17:30';
    });
  
    // Save settings
    settingsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const workDays = dayCheckboxes.map(checkbox => checkbox.checked);
      const startTime = startTimeInput.value;
      const endTime = endTimeInput.value;
  
      chrome.storage.sync.set({
        workDays: workDays,
        workStartTime: startTime,
        workEndTime: endTime
      }, function() {
        console.log('Settings saved:', { workDays, startTime, endTime });
        // Check if snackbar exists before trying to manipulate it
        if (snackbar) {
          snackbar.classList.remove('no-show');
          snackbar.textContent = 'Settings have been updated';
          
          // Make the snackbar fade away after 3 seconds
          setTimeout(() => {
            snackbar.classList.add('no-show');
          }, 3000);
        } else {
          console.error('Snackbar element not found.');
        }
      });
    });
  });