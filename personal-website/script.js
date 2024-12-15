document.addEventListener('DOMContentLoaded', () => {
    const modeToggle = document.getElementById('mode-toggle');
    const body = document.body;

    // Check for saved user preference, if any
    const currentMode = localStorage.getItem('mode') || 'light';
    body.classList.add(currentMode);

    modeToggle.addEventListener('click', () => {
        // Toggle between light and dark mode
        body.classList.toggle('dark');
        body.classList.toggle('light');
        const newMode = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('mode', newMode);
    });
}); 