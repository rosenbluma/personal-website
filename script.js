document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const tracker = document.querySelector('.tracker');
    const themeNodes = document.querySelectorAll('.theme-node');
    

    // Load the saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'white';
    setTheme(savedTheme);

    // Add event listeners to theme nodes
    themeNodes.forEach(node => {
        node.addEventListener('click', () => {
            const theme = node.dataset.theme; // Get theme from data attribute
            setTheme(theme);
        });
    });

    function setTheme(theme) {
        // Remove all theme classes
        body.classList.remove(
            'white',
            'black',
            'pink',
            'blue',
            'purple',
            'red',
            'yellow',
            'green',
            'orange'
        );
    
        // Add the selected theme class
        body.classList.add(theme);
    
        // Save the selected theme in localStorage
        localStorage.setItem('theme', theme);
    }
    

    // Generate and render fitness tracker data
    const fitnessData = generateMockFitnessData();
    fitnessData.forEach(activity => {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        if (activity === 'lift') dayDiv.classList.add('lift');
        else if (activity === 'run') dayDiv.classList.add('run');
        else if (activity === 'both') dayDiv.classList.add('both');
        tracker.appendChild(dayDiv);
    });
});

// Function to generate mock fitness data for 365 days
function generateMockFitnessData() {
    const activities = ['lift', 'run', 'both', null]; // Activity types
    const data = [];
    for (let i = 0; i < 365; i++) {
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        data.push(randomActivity);
    }
    return data;
}
