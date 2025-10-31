// --- CONSTANTS ---
const LOCAL_STORAGE_KEY_THEME = 'instagram_feed_theme';
const LOCAL_STORAGE_KEY_GROUPS = 'instagram_feed_hidden_groups';
// New key for tracking a single, exclusively selected account
const LOCAL_STORAGE_KEY_SELECTED_ACCOUNT = 'instagram_feed_selected_account'; 

// Global state variables
let ALL_POST_DATA = [];
let UNIQUE_ACCOUNTS = new Set();
let UNIQUE_GROUPS = new Set();

// --- UTILITY FUNCTIONS ---

/**
 * Utility function to convert YYYY-MM-DD (storage format) to a readable MM/DD/YYYY format.
 * @param {string} dateString The date in YYYY-MM-DD format.
 * @returns {string} The date in MM/DD/YYYY format or a default message.
 */
function formatDisplayDate(dateString) {
    if (!dateString || dateString.length !== 10) return 'Date N/A';
    const [year, month, day] = dateString.split('-');
    // Check if parts are valid before restructuring
    if (year && month && day) {
        return `${month}/${day}/${year}`;
    }
    return 'Date N/A';
}

// --- DARK MODE LOGIC ---

/**
 * Sets up the dark mode toggle and loads the saved theme preference.
 */
function setupDarkMode() {
    const body = document.body;
    const toggle = document.getElementById('dark-mode-toggle');

    // 1. Load saved preference
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME);
    let isDarkMode;

    if (savedTheme === 'light') {
        isDarkMode = false;
        body.classList.remove('dark-mode');
        toggle.classList.remove('active');
    } else {
        isDarkMode = true;
        body.classList.add('dark-mode');
        toggle.classList.add('active');
        if (!savedTheme) {
            localStorage.setItem(LOCAL_STORAGE_KEY_THEME, 'dark');
        }
    }

    // 2. Setup click listener
    toggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        body.classList.toggle('dark-mode', isDarkMode);
        toggle.classList.toggle('active', isDarkMode);
        
        // Save new preference
        localStorage.setItem(LOCAL_STORAGE_KEY_THEME, isDarkMode ? 'dark' : 'light');
    });
}


// --- FILTERING AND SORTING LOGIC ---

/**
 * Loads the list of hidden group IDs from local storage.
 * @returns {Set<string>} A set of hidden group IDs.
 */
function loadHiddenGroups() {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_GROUPS);
    try {
        const array = json ? JSON.parse(json) : [];
        return new Set(array);
    } catch (e) {
        console.error('Error parsing hidden groups from storage', e);
        return new Set();
    }
}

/**
 * Saves the list of hidden group IDs to local storage.
 * @param {Set<string>} hiddenGroups The set of group IDs to hide.
 */
function saveHiddenGroups(hiddenGroups) {
    localStorage.setItem(LOCAL_STORAGE_KEY_GROUPS, JSON.stringify(Array.from(hiddenGroups)));
}

/**
 * Loads the currently selected single account from local storage.
 * @returns {string | null} The selected username or null.
 */
function loadSelectedAccount() {
    return localStorage.getItem(LOCAL_STORAGE_KEY_SELECTED_ACCOUNT);
}

/**
 * Saves the currently selected single account to local storage.
 * @param {string | null} username The selected username or null to clear.
 */
function saveSelectedAccount(username) {
    if (username) {
        localStorage.setItem(LOCAL_STORAGE_KEY_SELECTED_ACCOUNT, username);
    } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY_SELECTED_ACCOUNT);
    }
}

/**
 * Toggles a group's visibility and re-renders the feed.
 * @param {string} groupId The ID of the group to toggle.
 */
function toggleGroupVisibility(groupId) {
    const hiddenGroups = loadHiddenGroups();
    
    if (hiddenGroups.has(groupId)) {
        hiddenGroups.delete(groupId);
    } else {
        hiddenGroups.add(groupId);
    }
    
    saveHiddenGroups(hiddenGroups);
    loadInstagramFeed(false); // Re-render without re-fetching data
}

/**
 * Toggles a specific account selection for exclusive viewing.
 * @param {string} username The username to select/deselect.
 */
function toggleAccountSelection(username) {
    const currentSelected = loadSelectedAccount();
    
    if (currentSelected === username) {
        saveSelectedAccount(null); // Deselect
    } else {
        saveSelectedAccount(username); // Select
    }
    
    loadInstagramFeed(false); // Re-render without re-fetching data
}

/**
 * Filters the master list of posts based on current preferences (groups and account).
 * @param {Array<Object>} posts The full array of post data.
 * @param {Set<string>} hiddenGroups Group IDs to filter out.
 * @param {string | null} selectedAccount Username for exclusive filter.
 * @returns {Array<Object>} The filtered list of posts.
 */
function filterPosts(posts, hiddenGroups, selectedAccount) {
    return posts.filter(post => {
        // 1. Group filtering: Post must not be in a hidden group
        const groupPass = !hiddenGroups.has(post.group_id);
        
        // 2. Account filtering: If an account is selected, the post must match that account
        const accountPass = !selectedAccount || (post.username === selectedAccount);
        
        return groupPass && accountPass;
    });
}

/**
 * Renders the filtered posts into the feed container.
 * @param {Array<Object>} filteredPosts The array of posts to display.
 */
function renderInstagramFeed(filteredPosts) {
    const feedContainer = document.getElementById('instagram-feed');
    
    // Clear previous content
    feedContainer.innerHTML = ''; 

    if (filteredPosts.length === 0) {
        feedContainer.innerHTML = `<div class="loading-message">No posts match the current filter selection.</div>`;
        return;
    }

    filteredPosts.forEach(post => {
        const displayDate = formatDisplayDate(post.date_posted); // Format date for display
        
        // The embedded Instagram div is the only element needed for Instagram's embed.js to work
        const postHtml = `
            <div class="instagram-card" data-group-id="${post.group_id}" data-username="${post.username}">
                <div class="card-header">
                    <span class="group-tag">${post.group_name || 'N/A'}</span>
                    <span class="date-tag">Posted: ${displayDate}</span>
                </div>
                <blockquote class="instagram-media" 
                    data-instgrm-permalink="${post.url}" 
                    data-instgrm-version="14">
                </blockquote>
            </div>
        `;
        feedContainer.insertAdjacentHTML('beforeend', postHtml);
    });

    // Re-run Instagram's embed script to process the new blockquotes
    // This is necessary because we dynamically added new Instagram elements
    if (window.instgrm) {
        window.instgrm.Embeds.process();
    }
}

/**
 * Creates the toggle buttons for group filtering.
 * @param {Set<Object>} groups The set of unique group objects ({id, name}).
 * @param {Set<string>} hiddenGroups The set of IDs currently hidden.
 */
function createGroupToggles(groups, hiddenGroups) {
    const container = document.getElementById('group-filter-controls');
    container.innerHTML = '';
    
    // Convert set back to array and sort by group ID for consistency
    const sortedGroups = Array.from(groups).sort((a, b) => a.id.localeCompare(b.id));

    sortedGroups.forEach(group => {
        const isActive = !hiddenGroups.has(group.id);
        const button = document.createElement('button');
        button.className = `filter-button ${isActive ? 'active' : ''}`;
        button.textContent = group.name;
        button.onclick = () => toggleGroupVisibility(group.id);
        container.appendChild(button);
    });
}

/**
 * Creates the toggle buttons for account filtering.
 * @param {Set<string>} accounts The set of unique usernames.
 * @param {string | null} selectedAccount The username currently selected for exclusive view.
 */
function createAccountToggles(accounts, selectedAccount) {
    const container = document.getElementById('account-filter-controls');
    container.innerHTML = '';
    
    // Convert set back to array and sort alphabetically
    const sortedAccounts = Array.from(accounts).sort();

    sortedAccounts.forEach(username => {
        const isActive = username === selectedAccount;
        const button = document.createElement('button');
        button.className = `filter-button account-filter ${isActive ? 'active' : ''}`;
        button.textContent = `@${username}`;
        button.onclick = () => toggleAccountSelection(username);
        container.appendChild(button);
    });
}

/**
 * Applies all current filters to the master post list and initiates rendering.
 * @param {Array<Object>} posts The full list of posts.
 * @param {Set<string>} hiddenGroups Currently hidden group IDs.
 * @param {string | null} selectedAccount Current selected account username.
 */
function applyFiltersAndRender(posts, hiddenGroups, selectedAccount) {
    const filtered = filterPosts(posts, hiddenGroups, selectedAccount);
    renderInstagramFeed(filtered);
}


// --- MAIN EXECUTION FLOW ---

/**
 * Loads data from JSON, processes it, sets up UI, and renders the feed.
 * @param {boolean} initializeData If true, data is fetched and processed (only on initial load).
 */
async function loadInstagramFeed(initializeData = true) {
    const feedContainer = document.getElementById('instagram-feed');

    if (initializeData) {
        try {
            const response = await fetch('feed_data.json');
            if (!response.ok) throw new Error('Network response not ok');
            const data = await response.json();
            
            const groupDefinitions = data.groups || [];
            const postDefinitions = data.posts || [];
            
            const groupMap = new Map(groupDefinitions.map(g => [g.id, g.name]));
            
            // 1. Process Posts and build the unique accounts list
            UNIQUE_ACCOUNTS = new Set();
            ALL_POST_DATA = postDefinitions.map(post => {
                UNIQUE_ACCOUNTS.add(post.username);
                const groupName = groupMap.get(post.group_id) || 'Unknown Group';
                return {
                    ...post,
                    // Add group_name to the post object for consistent rendering and filtering
                    group_name: groupName 
                };
            });

            // 2. Sort the posts by date_posted (newest first), then order_id
            ALL_POST_DATA.sort((a, b) => {
                const dateA = a.date_posted || '0000-01-01';
                const dateB = b.date_posted || '0000-01-01';

                // Primary sort: Date Descending (Newest first)
                if (dateA !== dateB) {
                    return dateB.localeCompare(dateA);
                }
                // Secondary sort: Order ID Ascending
                return a.order_id.localeCompare(b.order_id);
            });

            // 3. Set unique groups from the definition list
            UNIQUE_GROUPS = new Set(groupDefinitions.map(g => ({ id: g.id, name: g.name })));
            
        } catch (error) {
            console.error('Error loading the Instagram feed:', error);
            feedContainer.innerHTML = `<div class="loading-message" style="color: red;">Error: Could not load feed data. Please ensure 'feed_data.json' exists and is valid.</div>`;
            return;
        }
    }

    // 4. Load filter preferences
    const hiddenGroups = loadHiddenGroups();
    const selectedAccount = loadSelectedAccount();
    
    // 5. Create filter UI (only re-create the buttons if it's the initial data load)
    createGroupToggles(UNIQUE_GROUPS, hiddenGroups);
    createAccountToggles(UNIQUE_ACCOUNTS, selectedAccount);


    // 6. Apply filters and render
    applyFiltersAndRender(ALL_POST_DATA, hiddenGroups, selectedAccount);
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    setupDarkMode(); // Initialize dark mode first
    loadInstagramFeed(true);
});
