const timeSpentKey = 'timeSpent';
const dailyGoalKey = 'dailyGoal';
const timeLimitKey = 'timeLimit';
const trackedDomainsKey = 'trackedDomains';
const categoryMapKey = 'categoryMap';
const socialMediaDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'reddit.com'];
const videoDomains = ['youtube.com', 'vimeo.com', 'netflix.com', 'primevideo.com'];

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded in popup.js fired!');

  // Tab functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabToShow = button.dataset.tab;

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(tabToShow + '-tab').classList.add('active');

      updatePopupData(tabToShow);
    });
  });

  // Button event listeners
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  const editGoalsBtn = document.getElementById('editGoalsBtn');
  if (editGoalsBtn) {
    editGoalsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage(); // Assuming goals are edited in options
    });
  }

  const viewDetailsBtn = document.getElementById('viewDetailsBtn');
  if (viewDetailsBtn) {
    viewDetailsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Initial data load for the active tab
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'today';
  updatePopupData(activeTab);
  setInterval(() => updatePopupData(activeTab), 5000); // Update data every 5 seconds
});

function updatePopupData(tab) {
  chrome.storage.sync.get([timeSpentKey, dailyGoalKey, timeLimitKey], (data) => {
    const timeSpent = data[timeSpentKey] || {};
    const dailyGoal = data[dailyGoalKey] || 60;
    const timeLimit = data[timeLimitKey] || 120;

    const today = new Date().toDateString();
    const weekStart = getWeekStartDate();

    // Calculate total times
    let totalTimeToday = 0;
    let socialTimeToday = 0;
    let videoTimeToday = 0;
    const todaySites = {};

    let totalTimeWeek = 0;
    const weeklyData = {}; // { dateString: totalTime }

    // Process each domain's time data
    for (const domain in timeSpent) {
      const domainData = timeSpent[domain] || {};
      
      // Today's data
      if (domainData[today]) {
        const timeInMinutes = Math.round(domainData[today] / (1000 * 60));
        totalTimeToday += timeInMinutes;
        
        // Categorize the time
        if (socialMediaDomains.some(d => domain.includes(d))) {
          socialTimeToday += timeInMinutes;
        }
        if (videoDomains.some(d => domain.includes(d))) {
          videoTimeToday += timeInMinutes;
        }
        
        // Add to today's sites breakdown
        if (timeInMinutes > 0) {
          todaySites[domain] = timeInMinutes;
        }
      }

      // Weekly data - loop through past 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateString = date.toDateString();
        
        if (domainData[dateString]) {
          const timeInMinutes = Math.round(domainData[dateString] / (1000 * 60));
          weeklyData[dateString] = (weeklyData[dateString] || 0) + timeInMinutes;
          totalTimeWeek += timeInMinutes;
        }
      }
    }

    // Update Today tab
    if (tab === 'today') {
      document.getElementById('total-time-today').textContent = `${totalTimeToday}m`;
      document.getElementById('social-time-today').textContent = `${socialTimeToday}m`;
      document.getElementById('video-time-today').textContent = `${videoTimeToday}m`;
      
      // Clear any existing chart
      if (window.todayChart) {
        window.todayChart.destroy();
      }
      renderTodayChart(todaySites);
      renderTopSites(todaySites, 'today-sites-list');
    }

    // Update This Week tab
    if (tab === 'week') {
      const avgTimeWeek = Object.keys(weeklyData).length > 0 ? 
          Math.round(totalTimeWeek / Object.keys(weeklyData).length) : 0;
      
      document.getElementById('total-time-week').textContent = `${totalTimeWeek}m`;
      document.getElementById('avg-time-week').textContent = `${avgTimeWeek}m`;
      
      // Clear any existing charts
      if (window.weekChart) {
        window.weekChart.destroy();
      }
      if (window.categoryWeekChart) {
        window.categoryWeekChart.destroy();
      }
      
      renderWeekChart(weeklyData);
      renderCategoryWeekChart(timeSpent, weekStart);
    }

    // Update Goals tab
    if (tab === 'goals') {
      updateGoalsDisplay(dailyGoal, timeLimit, totalTimeToday, socialTimeToday, videoTimeToday);
    }
  });
}
function renderTodayChart(data) {
  setTimeout(() => {
    const todayChartCanvas = document.getElementById('todayChart');
    if (!todayChartCanvas) return;
    
    // Clear any existing chart
    if (window.todayChart) {
      window.todayChart.destroy();
    }
    
    const labels = Object.keys(data);
    const chartData = Object.values(data);
    const backgroundColors = generateRandomColors(labels.length);
    
    if (labels.length === 0) {
      // Handle empty data case
      const ctx = todayChartCanvas.getContext('2d');
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', todayChartCanvas.width/2, todayChartCanvas.height/2);
      return;
    }
    function renderTodayChart(data) {
      console.log("Rendering today chart with data:", data);
      const todayChartCanvas = document.getElementById('todayChart');
      if (!todayChartCanvas) {
        console.log("Chart canvas not found!");
        return;
      }
      // Rest of the function...
    }
    window.todayChart = new Chart(todayChartCanvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: chartData,
          backgroundColor: backgroundColors,
          borderWidth: 1
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              boxWidth: 12
            }
          } 
        } 
      }
    });
  }, 50);
}
function renderWeekChart(data) {
  const weekChartCanvas = document.getElementById('weekChart');
  if (!weekChartCanvas) return;
  
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const orderedData = [];
  const labels = [];
  
  // Convert dates to day names and ensure proper order
  Object.keys(data).forEach(dateStr => {
    const date = new Date(dateStr);
    const dayName = dayOrder[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Convert to Mon-Sun format
    labels.push(dayName);
    orderedData.push({
      day: dayName,
      value: data[dateStr],
      date: date
    });
  });
  
  // Sort by date
  orderedData.sort((a, b) => a.date - b.date);
  
  window.weekChart = new Chart(weekChartCanvas, {
    type: 'bar',
    data: {
      labels: orderedData.map(d => d.day),
      datasets: [{
        label: 'Minutes Spent',
        data: orderedData.map(d => d.value),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      scales: { 
        y: { 
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes'
          }
        } 
      } 
    }
  });
}

function renderCategoryWeekChart(timeSpent, weekStart) {
  const categoryWeekChartCanvas = document.getElementById('categoryWeekChart');
  if (!categoryWeekChartCanvas) return;
  
  // Prepare week days
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    weekDays.push(date.toDateString());
  }
  
  // Process data by category
  const categories = {
    'Social Media': {color: 'rgba(255, 99, 132, 0.7)', data: {}},
    'Video': {color: 'rgba(54, 162, 235, 0.7)', data: {}},
    'Other': {color: 'rgba(255, 206, 86, 0.7)', data: {}}
  };
  
  // Initialize all days with zero for each category
  weekDays.forEach(day => {
    categories['Social Media'].data[day] = 0;
    categories['Video'].data[day] = 0;
    categories['Other'].data[day] = 0;
  });
  
  // Fill in actual data
  for (const domain in timeSpent) {
    let category = 'Other';
    if (socialMediaDomains.some(d => domain.includes(d))) {
      category = 'Social Media';
    } else if (videoDomains.some(d => domain.includes(d))) {
      category = 'Video';
    }
    
    // Add time spent for each day
    for (const day of weekDays) {
      if (timeSpent[domain][day]) {
        const minutes = Math.round(timeSpent[domain][day] / (1000 * 60));
        categories[category].data[day] += minutes;
      }
    }
  }
  
  // Prepare chart datasets
  const datasets = Object.keys(categories).map(categoryName => ({
    label: categoryName,
    data: weekDays.map(day => categories[categoryName].data[day]),
    backgroundColor: categories[categoryName].color,
    borderWidth: 1
  }));
  
  // Create chart
  window.categoryWeekChart = new Chart(categoryWeekChartCanvas, {
    type: 'bar',
    data: {
      labels: weekDays.map(d => new Date(d).toLocaleDateString(undefined, {weekday: 'short'})),
      datasets: datasets
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      scales: { 
        x: { stacked: true }, 
        y: { 
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes'
          }
        } 
      } 
    }
  });
}

function renderTopSites(sites, elementId) {
  const sitesListDiv = document.getElementById(elementId);
  if (!sitesListDiv) return;
  
  sitesListDiv.innerHTML = '';
  
  if (Object.keys(sites).length === 0) {
    sitesListDiv.innerHTML = '<p>No tracked sites visited today.</p>';
    return;
  }
  
  // Sort sites by time spent (descending)
  const sortedSites = Object.entries(sites)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  // Create site items
  sortedSites.forEach(([domain, minutes]) => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    
    // Create site first letter icon
    const firstLetter = domain.charAt(0).toUpperCase();
    const iconColor = generateRandomColor();
    
    siteItem.innerHTML = `
      <div class="site-info">
        <div class="site-icon" style="background-color: ${iconColor};">${firstLetter}</div>
        <span class="site-name">${domain}</span>
      </div>
      <span class="site-time">${minutes}m</span>
    `;
    
    sitesListDiv.appendChild(siteItem);
  });
}

function updateGoalsDisplay(dailyGoal, timeLimit, totalTime, socialTime, videoTime) {
  // Social media progress
  const socialGoalProgress = document.getElementById('social-goal-progress');
  const socialProgress = document.getElementById('social-progress');
  const socialGoalPercent = Math.min(100, Math.round((socialTime / (dailyGoal / 2)) * 100));
  
  // Video progress
  const videoGoalProgress = document.getElementById('video-goal-progress');
  const videoProgress = document.getElementById('video-progress');
  const videoGoalPercent = Math.min(100, Math.round((videoTime / (dailyGoal / 2)) * 100));
  
  // Total progress
  const allGoalProgress = document.getElementById('all-goal-progress');
  const allProgress = document.getElementById('all-progress');
  const allGoalPercent = Math.min(100, Math.round((totalTime / timeLimit) * 100));
  
  // Update DOM elements
  if (socialGoalProgress && socialProgress) {
    socialGoalProgress.textContent = `${socialTime}m / ${Math.round(dailyGoal/2)}m (${socialGoalPercent}%)`;
    socialProgress.style.width = `${socialGoalPercent}%`;
    
    // Update color based on progress
    if (socialGoalPercent > 90) {
      socialProgress.classList.add('danger');
    } else if (socialGoalPercent > 70) {
      socialProgress.classList.add('warning');
    } else {
      socialProgress.classList.remove('danger', 'warning');
    }
  }
  
  if (videoGoalProgress && videoProgress) {
    videoGoalProgress.textContent = `${videoTime}m / ${Math.round(dailyGoal/2)}m (${videoGoalPercent}%)`;
    videoProgress.style.width = `${videoGoalPercent}%`;
    
    if (videoGoalPercent > 90) {
      videoProgress.classList.add('danger');
    } else if (videoGoalPercent > 70) {
      videoProgress.classList.add('warning');
    } else {
      videoProgress.classList.remove('danger', 'warning');
    }
  }
  
  if (allGoalProgress && allProgress) {
    allGoalProgress.textContent = `${totalTime}m / ${timeLimit}m (${allGoalPercent}%)`;
    allProgress.style.width = `${allGoalPercent}%`;
    
    if (allGoalPercent > 90) {
      allProgress.classList.add('danger');
    } else if (allGoalPercent > 70) {
      allProgress.classList.add('warning');
    } else {
      allProgress.classList.remove('danger', 'warning');
    }
  }
}

function getWeekStartDate() {
  const today = new Date();
  const day = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday as the start
  const monday = new Date(today);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function generateRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function generateRandomColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(generateRandomColor());
  }
  return colors;
}

function testChart() {
  const canvas = document.getElementById('todayChart');
  if (!canvas) return;
  
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
      datasets: [{
        label: '# of Votes',
        data: [12, 19, 3, 5, 2, 3],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Call this function when popup opens
document.addEventListener('DOMContentLoaded', testChart);