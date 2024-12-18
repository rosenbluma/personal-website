document.addEventListener('DOMContentLoaded', () => {
    const tracker = document.querySelector('.tracker');
    const contributionsCountElement = document.querySelector('.contributions-count');
    const themeNodes = document.querySelectorAll('.theme-node');
    const contentWrapper = document.querySelector('.content-wrapper');
    const activityKeyContainer = document.getElementById('activity-key'); // For activity key

    const clientId = '142816';
    const clientSecret = '3af96ad67eaabcb268b8dd0a8cd4623ce0b00646';
    let accessToken = 'ad628baf3ae890414135d319f2d5f992a212e8dd';
    let refreshToken = '71c50142a150f9f37c0edefb748a93fe378d547b';
    let tokenExpiresAt = 1734568202;

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

    // Theme Management
    function setTheme(theme) {
        contentWrapper.className = `content-wrapper ${theme}`;
        localStorage.setItem('theme', theme);
    }
    const savedTheme = localStorage.getItem('theme') || 'white';
    setTheme(savedTheme);
    themeNodes.forEach(node => node.addEventListener('click', () => setTheme(node.dataset.theme)));

    // Generate Y-axis labels
    function generateYAxisLabels() {
        const todayIndex = new Date().getDay();
        return Array.from({ length: daysPerWeek }, (_, i) =>
            daysOfWeek[(todayIndex - i + daysOfWeek.length) % daysOfWeek.length]
        );
    }

    // Initialize Activity Grid
    function initializeGrid() {
        tracker.innerHTML = '';
        tracker.style.display = 'grid';
        tracker.style.gridTemplateColumns = `repeat(${totalWeeks + 1}, 12px)`;
        tracker.style.gridTemplateRows = `repeat(${daysPerWeek}, 12px)`;

        const yAxisLabels = generateYAxisLabels();
        for (let row = 0; row < daysPerWeek; row++) {
            const labelCell = document.createElement('div');
            labelCell.classList.add('label');
            labelCell.textContent = yAxisLabels[row];
            tracker.appendChild(labelCell);

            for (let col = 0; col < totalWeeks; col++) {
                const dayCell = document.createElement('div');
                dayCell.classList.add('day');
                dayCell.setAttribute('title', 'No activity');
                tracker.appendChild(dayCell);
            }
        }
    }

    // Populate Fitness Graph
    function populateFitnessGraph(activities) {
        console.log(`Populating graph with ${activities.length} activities`);
        const dayMap = {};

        activities.forEach(activity => {
            const date = new Date(activity.start_date).toISOString().split('T')[0];
            const color = activityColors[activity.sport_type || 'unknown'] || '#d3d3d3';
            const name = activity.name || 'Unnamed Activity';
            const duration = `${Math.floor(activity.moving_time / 60)} min`;

            if (!dayMap[date]) dayMap[date] = [];
            dayMap[date].push({ color, name, duration });
        });

        const dayCells = tracker.querySelectorAll('.day');
        let currentDate = new Date();
        for (let col = 0; col < totalWeeks; col++) {
            for (let row = 0; row < daysPerWeek; row++) {
                const cell = dayCells[row * totalWeeks + col];
                const dateString = currentDate.toISOString().split('T')[0];

                if (dayMap[dateString]) {
                    const { color, name, duration } = dayMap[dateString][0];
                    cell.style.backgroundColor = color;
                    cell.setAttribute('title', `${name} - ${duration}`);
                }

                currentDate.setDate(currentDate.getDate() - 1);
            }
        }
    }

    function generateActivityKey() {
        console.log('Generating activity key...');
    
        // Check if activity key container exists
        if (!activityKeyContainer) {
            console.error('Error: activityKeyContainer not found in DOM.');
            return;
        }
    
        activityKeyContainer.innerHTML = ''; // Clear any previous content
        Object.entries(activityColors).forEach(([activity, color]) => {
            console.log('Adding key for:', activity, color);
    
            const keyItem = document.createElement('div');
            keyItem.classList.add('key-item');
            keyItem.innerHTML = `
                <div class="key-color" style="background-color: ${color}; width: 12px; height: 12px; margin-right: 8px;"></div>
                <span>${activityDisplayNames[activity] || activity}</span>
            `;
            activityKeyContainer.appendChild(keyItem);
        });
    
        console.log('Activity key generated successfully!');
    }
    

    async function fetchStravaActivities() {
        const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
        const perPage = 200;
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const allActivities = [];
    
        try {
            for (let page = 1; page <= 5; page++) {
                console.log(`Fetching page ${page}...`);
                const response = await fetch(
                    `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}&after=${oneYearAgo}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
    
                const rateLimit = response.headers.get("X-Ratelimit-Limit");
                const rateUsage = response.headers.get("X-Ratelimit-Usage");
                const readLimit = response.headers.get("X-ReadRatelimit-Limit");
                const readUsage = response.headers.get("X-ReadRatelimit-Usage");
    
                console.log(`Rate Limit: ${rateLimit}, Usage: ${rateUsage}`);
                console.log(`Read Limit: ${readLimit}, Read Usage: ${readUsage}`);
    
                if (response.status === 429) {
                    console.warn("Rate limit hit. Waiting until reset...");
                    await delay(15 * 60 * 1000); // Wait for 15 minutes
                    page--; // Retry the current page
                    continue;
                }
    
                if (!response.ok) {
                    throw new Error(`Error fetching page ${page}: ${response.status} ${response.statusText}`);
                }
    
                const data = await response.json();
                allActivities.push(...data);
    
                if (data.length < perPage) break; // Stop if fewer results than expected
                await delay(1000); // Delay between requests to avoid hitting limits
            }
    
            console.log(`Fetched ${allActivities.length} activities`);
            populateFitnessGraph(allActivities);
            generateActivityKey();
        } catch (error) {
            console.error("Error fetching activities:", error);
        }
    }
    

    // Refresh Token Logic
    async function refreshAccessToken() {
        console.log('Refreshing access token...');
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        if (!response.ok) throw new Error('Failed to refresh token');
        const data = await response.json();
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        tokenExpiresAt = data.expires_at;

        console.log('Token refreshed:', data);
    }

    // Main Execution
    async function main() {
        if (Date.now() / 1000 >= tokenExpiresAt) {
            await refreshAccessToken();
        }
        initializeGrid();
        generateActivityKey(); // Force the activity key generation
        await fetchStravaActivities();
    }

    main();
});
