const trackedDomainsKey = 'trackedDomains';
const dailyGoalKey = 'dailyGoal';
const timeLimitKey = 'timeLimit';
const statusMessage = document.getElementById('statusMessage');
const trackedDomainsInput = document.getElementById('trackedDomains');
const dailyGoalInput = document.getElementById('dailyGoal');
const timeLimitInput = document.getElementById('timeLimit');
const saveButton = document.getElementById('saveOptions');

function loadOptions() {
  chrome.storage.sync.get([trackedDomainsKey, dailyGoalKey, timeLimitKey], (data) => {
    trackedDomainsInput.value = (data[trackedDomainsKey] || []).join('\n');
    dailyGoalInput.value = data[dailyGoalKey] || 60;
    timeLimitInput.value = data[timeLimitKey] || 120;
  });
}

function saveOptions() {
  const domains = trackedDomainsInput.value.split('\n').map(domain => domain.trim()).filter(domain => domain !== '');
  const dailyGoal = parseInt(dailyGoalInput.value, 10) || 0;
  const timeLimit = parseInt(timeLimitInput.value, 10) || 0;

  chrome.storage.sync.set({
    [trackedDomainsKey]: domains,
    [dailyGoalKey]: dailyGoal,
    [timeLimitKey]: timeLimit
  }, () => {
    statusMessage.textContent = 'Options saved.';
    setTimeout(() => {
      statusMessage.textContent = '';
    }, 1500);
  });
}

document.addEventListener('DOMContentLoaded', loadOptions);
saveButton.addEventListener('click', saveOptions);

// options.js
document.getElementById('save').addEventListener('click', () => {
  const trackingEnabled = document.getElementById('tracking').checked;
  chrome.storage.sync.set({ trackingEnabled }, () => {
      console.log('Tracking preference saved.');
  });
});
