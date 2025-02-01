document.addEventListener('DOMContentLoaded', () => {
    const tracker = document.querySelector('.tracker');
    const contributionsCountElement = document.querySelector('.contributions-count');
    const themeNodes = document.querySelectorAll('.theme-node');
    const contentWrapper = document.querySelector('.content-wrapper');
    const activityKeyContainer = document.getElementById('activity-key'); 

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
        Walk: '#0066f2', //
        Snowboard: '#B0E0E6' // 
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
        Walk: 'Walking', // Added Walking
        Snowboard: 'Snowboarding'
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

    function convertToPST(utcDate) {
        const date = new Date(utcDate);
        const offsetInMinutes = date.getTimezoneOffset() + 480; // 480 minutes = 8 hours
        return new Date(date.getTime() - offsetInMinutes * 60 * 1000);
    }

    function populateFitnessGraph(activities) {
        console.log(`Populating graph with ${activities.length} activities`);
        const dayMap = {};

        activities.forEach(activity => {
            const pstDate = convertToPST(activity.start_date);
            const date = pstDate.toISOString().split('T')[0];
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
                const pstDate = convertToPST(currentDate);
                const currentDateString = pstDate.toISOString().split('T')[0];

                if (dayMap[currentDateString]) {
                    const activitiesForDay = dayMap[currentDateString];
                    const activityCount = activitiesForDay.length;

                    if (activityCount === 1) {
                        const { color, name, duration } = activitiesForDay[0];
                        cell.style.backgroundColor = color;
                        cell.setAttribute('title', `${name} - ${duration}`);
                    } else if (activityCount >= 2) {
                        const gradients = activitiesForDay.map(
                            ({ color }, idx, arr) =>
                                `${color} ${(idx / arr.length) * 100}%, ${color} ${((idx + 1) / arr.length) * 100}%`
                        );
                        cell.style.background = `linear-gradient(to right, ${gradients.join(', ')})`;
                        const tooltip = activitiesForDay
                            .map(({ name, duration }) => `${name} - ${duration}`)
                            .join(' + ');
                        cell.setAttribute('title', tooltip);
                    }
                }

                currentDate.setDate(currentDate.getDate() - 1);
            }
        }
    }

    function generateActivityKey() {
        console.log('Generating activity key...');
        if (!activityKeyContainer) {
            console.error('Error: activityKeyContainer not found in DOM.');
            return;
        }

        activityKeyContainer.innerHTML = '';
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
        const cacheKey = 'stravaActivities';
        const cacheTimestampKey = 'stravaCacheTimestamp';
        const cacheExpiration = 60 * 60 * 1000;
        const currentTime = Date.now();
        const oneYearAgoTimestamp = Date.now() - 365 * 24 * 60 * 60 * 1000;

        const cachedActivities = JSON.parse(localStorage.getItem(cacheKey));
        const cacheTimestamp = localStorage.getItem(cacheTimestampKey);

        if (cachedActivities && cacheTimestamp && currentTime - cacheTimestamp < cacheExpiration) {
            console.log('Using cached activities');
            populateFitnessGraph(cachedActivities);
            generateActivityKey();
            updateContributionsCount(cachedActivities, oneYearAgoTimestamp);
            return;
        }

        console.log('Fetching new activities from API');
        const oneYearAgo = Math.floor(oneYearAgoTimestamp / 1000);
        const perPage = 200;

        try {
            const [page1, page2] = await Promise.all([
                fetch(
                    `https://www.strava.com/api/v3/athlete/activities?page=1&per_page=${perPage}&after=${oneYearAgo}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                ),
                fetch(
                    `https://www.strava.com/api/v3/athlete/activities?page=2&per_page=${perPage}&after=${oneYearAgo}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                )
            ]);

            if (!page1.ok || !page2.ok) {
                throw new Error('Error fetching activities');
            }

            const activities1 = await page1.json();
            const activities2 = await page2.json();

            const allActivities = [...activities1, ...activities2];
            localStorage.setItem(cacheKey, JSON.stringify(allActivities));
            localStorage.setItem(cacheTimestampKey, currentTime);

            console.log(`Fetched ${allActivities.length} activities`);
            populateFitnessGraph(allActivities);
            generateActivityKey();
            updateContributionsCount(allActivities, oneYearAgoTimestamp);
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }

    function updateContributionsCount(activities, oneYearAgoTimestamp) {
        const activityCount = activities.filter(activity => {
            const activityDate = new Date(activity.start_date).getTime();
            return activityDate >= oneYearAgoTimestamp;
        }).length;

        console.log(`Total activities in the last year: ${activityCount}`);
        contributionsCountElement.textContent = `${activityCount} workouts in the last year`;
    }

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

    async function main() {
        if (Date.now() / 1000 >= tokenExpiresAt) {
            await refreshAccessToken();
        }
        initializeGrid();
        generateActivityKey();
        await fetchStravaActivities();
    }

    main();
});
