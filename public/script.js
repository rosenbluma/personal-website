document.addEventListener('DOMContentLoaded', () => {
    const tracker = document.querySelector('.tracker');
    const contributionsCountElement = document.querySelector('.contributions-count');
    const themeNodes = document.querySelectorAll('.theme-node');
    const contentWrapper = document.querySelector('.content-wrapper');
    const activityKeyContainer = document.getElementById('activity-key'); // For the key

    const clientId = '142816';
    const clientSecret = '3af96ad67eaabcb268b8dd0a8cd4623ce0b00646';
    let accessToken = 'b45f74e9cd130e7503defc75f18202f0cc88cc81';
    let refreshToken = '71c50142a150f9f37c0edefb748a93fe378d547b';
    let tokenExpiresAt = 0;

    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const totalWeeks = 52;
    const daysPerWeek = 7;

    const activityColors = {
        WeightTraining: '#87CEFA',
        Ride: '#03A9F4',
        Pickleball: '#006666',
        Tennis: '#9C27B0',
        Run: '#1E90FF',
        Hike: '#8B0000',
        Surfing: '#4169E1',
        Workout: '#9370DB',
    };

    const activityDisplayNames = {
        WeightTraining: 'Lifting',
        Ride: 'Cycling',
        Pickleball: 'Pickleball',
        Tennis: 'Tennis',
        Run: 'Running',
        Hike: 'Hiking',
        Surfing: 'Surfing',
        Workout: 'Ultimate',
    };

    // Set theme dynamically
    function setTheme(theme) {
        contentWrapper.className = `content-wrapper ${theme}`;
        localStorage.setItem('theme', theme);
    }

    const savedTheme = localStorage.getItem('theme') || 'white';
    setTheme(savedTheme);

    themeNodes.forEach(node => {
        node.addEventListener('click', () => setTheme(node.dataset.theme));
    });

    // Generate Y-axis labels
    function generateYAxisLabels() {
        const todayIndex = new Date().getDay();
        return Array.from({ length: daysPerWeek }, (_, i) =>
            daysOfWeek[(todayIndex - i + daysOfWeek.length) % daysOfWeek.length]
        );
    }

    // Initialize grid
    function initializeGrid() {
        tracker.innerHTML = '';
        tracker.style.display = 'grid';
        tracker.style.gridTemplateColumns = `repeat(${totalWeeks + 1}, 12px)`; // Extra column for Y-axis
        tracker.style.gridTemplateRows = `repeat(${daysPerWeek}, 12px)`; // 7 rows

        const yAxisLabels = generateYAxisLabels();

        for (let row = 0; row < daysPerWeek; row++) {
            const labelCell = document.createElement('div');
            labelCell.classList.add('label');
            labelCell.textContent = yAxisLabels[row];
            tracker.appendChild(labelCell);

            for (let col = 0; col < totalWeeks; col++) {
                const dayCell = document.createElement('div');
                dayCell.classList.add('day');
                dayCell.setAttribute('title', 'No activity'); // Default tooltip
                tracker.appendChild(dayCell);
            }
        }
    }

    // Populate fitness graph with activity data
    function populateFitnessGraph(activities) {
        const dayMap = {};

        activities.forEach(activity => {
            const date = new Date(activity.start_date).toISOString().split('T')[0];
            const color = activityColors[activity.sport_type || 'unknown'] || '#d3d3d3';
            const name = activity.name || 'Unnamed Activity';
            const duration = activity.moving_time
                ? `${Math.floor(activity.moving_time / 3600)}h ${Math.floor((activity.moving_time % 3600) / 60)}m`
                : 'Duration unknown';

            if (!dayMap[date]) {
                dayMap[date] = [];
            }
            dayMap[date].push({ color, name, duration });
        });

        const dayCells = tracker.querySelectorAll('.day');
        let currentDate = new Date();

        for (let col = 0; col < totalWeeks; col++) {
            for (let row = 0; row < daysPerWeek; row++) {
                const cellIndex = row * totalWeeks + col;
                if (cellIndex >= dayCells.length) break;

                const cell = dayCells[cellIndex];
                const dateString = currentDate.toISOString().split('T')[0];

                if (dayMap[dateString]) {
                    const activities = dayMap[dateString];
                    if (activities.length === 1) {
                        const { color, name, duration } = activities[0];
                        cell.style.backgroundColor = color;
                        cell.setAttribute('title', `${name} - ${duration}`);
                    } else {
                        const leftColor = activities[0].color;
                        const rightColor = activities[1].color;
                        cell.style.background = `linear-gradient(to right, ${leftColor} 50%, ${rightColor} 50%)`;
                        cell.classList.add('multi');

                        const tooltip = activities
                            .map(a => `${a.name} - ${a.duration}`)
                            .join(' + ');
                        cell.setAttribute('title', tooltip);
                    }
                }

                currentDate.setDate(currentDate.getDate() - 1);
            }
        }
    }

    // Generate Activity Key dynamically
function generateActivityKey() {
    const activityKeyContainer = document.getElementById('activity-key');
    activityKeyContainer.innerHTML = ''; // Clear any previous content

    // Loop through the activity colors and use display names
    Object.entries(activityColors).forEach(([activity, color]) => {
        const keyItem = document.createElement('div');
        keyItem.classList.add('key-item');

        const colorBox = document.createElement('div');
        colorBox.classList.add('key-color');
        colorBox.style.backgroundColor = color;

        const label = document.createElement('span');
        label.textContent = activityDisplayNames[activity] || activity; // Use display name if available

        keyItem.appendChild(colorBox);
        keyItem.appendChild(label);
        activityKeyContainer.appendChild(keyItem);
    });
}
    

async function fetchStravaActivities() {
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    if (Date.now() / 1000 >= tokenExpiresAt) await refreshAccessToken();

    const perPage = 200;
    const oneYearAgoEpoch = Math.floor(oneYearAgo.getTime() / 1000);
    const nowEpoch = Math.floor(Date.now() / 1000);

    try {
        const fetchPromises = Array.from({ length: 5 }, (_, i) =>
            fetch(
                `https://www.strava.com/api/v3/athlete/activities?page=${i + 1}&per_page=${perPage}&after=${oneYearAgoEpoch}&before=${nowEpoch}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            ).then(response => {
                if (!response.ok) throw new Error(`Error fetching page ${i + 1}`);
                return response.json();
            })
        );

        const results = await Promise.allSettled(fetchPromises);
        const successfulResults = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        const allActivities = successfulResults.flat();

        contributionsCountElement.textContent = `${allActivities.length} contributions in the last year`;
        populateFitnessGraph(allActivities);
        generateActivityKey();
    } catch (error) {
        console.error('Error fetching Strava activities:', error);
    }
}


    // Refresh access token
    async function refreshAccessToken() {
        try {
            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            });

            if (!response.ok) throw new Error('Failed to refresh token');

            const data = await response.json();
            accessToken = data.access_token;
            refreshToken = data.refresh_token;
            tokenExpiresAt = data.expires_at;
        } catch (error) {
            console.error('Error refreshing token:', error);
        }
    }

    initializeGrid();
    fetchStravaActivities();
});