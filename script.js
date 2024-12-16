document.addEventListener('DOMContentLoaded', () => {
    // Get references to key DOM elements
    const tracker = document.querySelector('.tracker');
    const contributionsCountElement = document.querySelector('.contributions-count');
    const themeNodes = document.querySelectorAll('.theme-node'); 
    const body = document.body;

    // Strava API credentials and tokens
    // In a production setting, these should not be stored client-side.
    // Consider using a server-side solution or environment variables.
    const clientId = '142816';
    const clientSecret = '3af96ad67eaabcb268b8dd0a8cd4623ce0b00646';
    let accessToken = 'b45f74e9cd130e7503defc75f18202f0cc88cc81';
    let refreshToken = '71c50142a150f9f37c0edefb748a93fe378d547b';
    let tokenExpiresAt = 0;

    // Set up theme switching
    // Each theme-node div has a data-theme attribute.
    // Clicking it changes the site's theme.
    themeNodes.forEach(node => {
        node.addEventListener('click', () => {
            const selectedTheme = node.dataset.theme;
            setTheme(selectedTheme);
        });
    });

    /**
     * Sets the page theme by adding the appropriate class to the body element.
     * Also saves the selected theme to localStorage for persistence.
     * @param {string} theme - The name of the theme to set.
     */
    function setTheme(theme) {
        // Remove previously applied theme classes
        body.classList.remove(
            'white', 'black', 'pink', 'blue', 
            'purple', 'red', 'yellow', 'green', 'orange'
        );
        // Add the new theme
        body.classList.add(theme);
        // Save the theme choice
        localStorage.setItem('theme', theme);
    }

    // Load the saved theme (or default to 'white' if none saved)
    const savedTheme = localStorage.getItem('theme') || 'white';
    setTheme(savedTheme);

    /**
     * Refreshes the Strava access token when it expires.
     * Makes a request to the Strava OAuth endpoint to get a new token.
     */
    async function refreshAccessToken() {
        try {
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
            // Update tokens and expiry
            accessToken = data.access_token;
            refreshToken = data.refresh_token;
            tokenExpiresAt = data.expires_at;
        } catch (error) {
            console.error('Error refreshing token:', error);
        }
    }

    /**
     * Fetches Strava activities from the API for the past year.
     * Filters activities that are within the last 365 days.
     * Updates the contributions count and calls the graph population function.
     */
    async function fetchStravaActivities() {
        // Determine the start date (365 days ago)
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        // If token expired, refresh it before making further requests
        if (Date.now() / 1000 >= tokenExpiresAt) {
            await refreshAccessToken();
        }

        let allActivities = [];
        let page = 1;
        const perPage = 200; // Strava API limit per page

        try {
            // Keep fetching until no more activities are returned
            while (true) {
                const response = await fetch(
                    `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );

                if (!response.ok) throw new Error('Error fetching activities');

                const activities = await response.json();
                if (activities.length === 0) break; // No more data

                allActivities = allActivities.concat(activities);
                page++;
            }

            // Filter activities to only those in the last year
            const filteredActivities = allActivities.filter(activity => {
                const activityDate = new Date(activity.start_date);
                return activityDate >= oneYearAgo;
            });

            // Update contributions count text
            contributionsCountElement.textContent = `${filteredActivities.length} contributions in the last year`;

            // Populate the tracker visualization
            populateFitnessGraph(filteredActivities, oneYearAgo);
        } catch (error) {
            console.error('Error fetching Strava activities:', error);
        }
    }

    /**
     * Populates the fitness graph with a 52-week calendar.
     * Each column represents a week, rows represent days (Sunday at the top, Saturday at the bottom).
     * The top-left pixel corresponds to exactly 365 days ago.
     * @param {Array} activities - Array of Strava activities from the past year.
     * @param {Date} startDate - The start date (365 days ago).
     */
    function populateFitnessGraph(activities, startDate) {
        // Define colors for different activities
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

        // Map of dateString -> {activities: [{type, name, formattedDuration, color}]}
        const dayMap = {};
        activities.forEach(activity => {
            const activityDate = new Date(activity.start_date);
            const dateString = activityDate.toISOString().split('T')[0];
            const type = activity.sport_type || activity.type || 'unknown';
            const name = activity.name || 'Unnamed Activity';
            const duration = activity.moving_time || 0;

            const formattedDuration = duration
                ? `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
                : 'Duration unknown';

            if (!dayMap[dateString]) {
                dayMap[dateString] = {
                    activities: [{ type, name, formattedDuration, color: activityColors[type] || '#d3d3d3' }]
                };
            } else {
                dayMap[dateString].activities.push({
                    type,
                    name,
                    formattedDuration,
                    color: activityColors[type] || '#d3d3d3'
                });
            }
        });

        // Clear the tracker before populating
        tracker.innerHTML = '';

        // We have 52 weeks (columns) and 7 days (rows) = 364 days total.
        // The startDate (365 days ago) is the top-left Sunday.
        const totalWeeks = 52;
        const daysPerWeek = 7;

        for (let week = 0; week < totalWeeks; week++) {
            for (let dayOfWeek = 0; dayOfWeek < daysPerWeek; dayOfWeek++) {
                const currentDate = new Date(startDate);
                const offset = week * daysPerWeek + dayOfWeek;
                currentDate.setDate(currentDate.getDate() + offset);
                const dateString = currentDate.toISOString().split('T')[0];

                // Create a day cell
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('day');

                // If there's an activity on that date, color it accordingly
                if (dayMap[dateString]) {
                    const { activities } = dayMap[dateString];
                    if (activities.length > 1) {
                        // Multi-activity day: show split colors and combine info with a '+'
                        dayDiv.classList.add('multi');
                        dayDiv.style.setProperty('--left-color', activities[0].color);
                        dayDiv.style.setProperty('--right-color', activities[1].color);
                        const hoverDetails = activities
                            .map(a => `${a.name} - ${a.formattedDuration}`)
                            .join(' + ');
                        dayDiv.setAttribute('title', hoverDetails);
                    } else {
                        // Single activity day: just use the single color
                        dayDiv.style.backgroundColor = activities[0].color;
                        dayDiv.setAttribute('title', `${activities[0].name} - ${activities[0].formattedDuration}`);
                    }
                } else {
                    // No activity: default tooltip
                    dayDiv.setAttribute('title', 'No activity');
                }

                // Append the day cell to the tracker
                tracker.appendChild(dayDiv);
            }
        }
    }

    // Finally, fetch and display the activities
    fetchStravaActivities();
});
