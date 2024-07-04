// script.js

document.addEventListener('DOMContentLoaded', (event) => {
    const toggleSwitch = document.getElementById('darkModeToggle');

    // ローカルストレージからダークモードの状態を取得
    const currentMode = localStorage.getItem('dark-mode');
    if (currentMode === 'enabled') {
        document.body.classList.add('dark-mode');
        toggleSwitch.checked = true;
    }

    toggleSwitch.addEventListener('change', () => {
        if (toggleSwitch.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('dark-mode', 'enabled');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('dark-mode', 'disabled');
        }
    });
});
