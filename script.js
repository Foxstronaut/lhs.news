// --- CONSTANTS ---
const LOCAL_STORAGE_KEY_THEME = 'instagram_feed_theme';
const LOCAL_STORAGE_KEY_GROUPS = 'instagram_feed_hidden_groups';
const LOCAL_STORAGE_KEY_ACCOUNTS = 'instagram_feed_hidden_accounts';

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

// --- Group Filtering ---

/**
 * Loads the set of hidden account GROUP IDs from localStorage.
 * @returns {Set<string>} A Set of group IDs that are currently hidden.
 */
function loadHiddenGroups() {
    const savedFilters = localStorage.getItem(LOCAL_STORAGE_KEY_GROUPS);
    if (savedFilters) {
        try {
            return new Set(JSON.parse(savedFilters));
        } catch (e) {
            console.error("Failed to parse group filter preferences:", e);
        }
    }
    return new Set();
}

/**
 * Saves the set of hidden account GROUP IDs to localStorage.
 * @param {Set<string>} hiddenGroups The set of group IDs.
 */
function saveHiddenGroups(hiddenGroups) {
    localStorage.setItem(LOCAL_STORAGE_KEY_GROUPS, JSON.stringify(Array.from(hiddenGroups)));
}

/**
 * Creates and attaches the filter toggle buttons for account groups.
 */
function createGroupToggles(uniqueGroups, hiddenGroups) {
    const controlBar = document.getElementById('group-filter-controls');
    controlBar.innerHTML = '<span class="text-sm font-semibold pr-3 text-gray-500 dark:text-gray-400">Filter by Group:</span>';
    
    // Sort groups by ID (e.g., "0", "1")
    const sortedGroups = Array.from(uniqueGroups).sort((a, b) => a.id.localeCompare(b.id));

    sortedGroups.forEach(group => {
        const button = document.createElement('button');
        // Display Group ID and Name, sourced from the separate definition
        button.textContent = `Group ${group.id}: ${group.name}`; 
        button.setAttribute('data-group-id', group.id);
        
        const isActive = !hiddenGroups.has(group.id);
        if (isActive) {
            button.classList.add('active');
        }

        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-group-id');
            const isActiveState = e.target.classList.contains('active');
            
            if (isActiveState) {
                hiddenGroups.add(id);
                e.target.classList.remove('active');
            } else {
                hiddenGroups.delete(id);
                e.target.classList.add('active');
            }

            saveHiddenGroups(hiddenGroups);
            // Re-render the feed using the globally available postData and current account filters
            loadInstagramFeed(false); 
        });

        controlBar.appendChild(button);
    });
}


// --- Account Filtering ---

/**
 * Loads the set of hidden account usernames from localStorage.
 * @returns {Set<string>} A Set of usernames that are currently hidden.
 */
function loadHiddenAccounts() {
    const savedFilters = localStorage.getItem(LOCAL_STORAGE_KEY_ACCOUNTS);
    if (savedFilters) {
        try {
            return new Set(JSON.parse(savedFilters));
        } catch (e) {
            console.error("Failed to parse account filter preferences:", e);
        }
    }
    return new Set();
}

/**
 * Saves the set of hidden account usernames to localStorage.
 * @param {Set<string>} hiddenAccounts The set of usernames.
 */
function saveHiddenAccounts(hiddenAccounts) {
    localStorage.setItem(LOCAL_STORAGE_KEY_ACCOUNTS, JSON.stringify(Array.from(hiddenAccounts)));
}

/**
 * Creates and attaches the filter toggle buttons for individual accounts (usernames).
 */
function createAccountToggles(uniqueAccounts, hiddenAccounts) {
    const controlBar = document.getElementById('account-filter-controls');
    controlBar.innerHTML = '<span class="text-sm font-semibold pr-3 text-gray-500 dark:text-gray-400">Filter by Account:</span>';

    // Sort accounts by username
    const sortedAccounts = Array.from(uniqueAccounts).sort();

    sortedAccounts.forEach(username => {
        const button = document.createElement('button');
        button.textContent = `@${username}`; // Display with '@' prefix
        button.setAttribute('data-username', username);
        
        const isActive = !hiddenAccounts.has(username);
        if (isActive) {
            button.classList.add('active');
        }

        button.addEventListener('click', (e) => {
            const usernameToToggle = e.target.getAttribute('data-username');
            const isActiveState = e.target.classList.contains('active');
            
            if (isActiveState) {
                hiddenAccounts.add(usernameToToggle);
                e.target.classList.remove('active');
            } else {
                hiddenAccounts.delete(usernameToToggle);
                e.target.classList.add('active');
            }

            saveHiddenAccounts(hiddenAccounts);
            // Re-render the feed using the globally available postData and current group filters
            loadInstagramFeed(false); 
        });

        controlBar.appendChild(button);
    });
}


/**
 * Filters the post data and generates the HTML to render the feed.
 * @param {Array<Object>} postData The full list of sorted posts (which includes group_name after loading).
 * @param {Set<string>} hiddenGroups Group IDs that should be hidden.
 * @param {Set<string>} hiddenAccounts Usernames that should be hidden.
 */
function applyFiltersAndRender(postData, hiddenGroups, hiddenAccounts) {
    const feedContainer = document.getElementById('instagram-feed');
    feedContainer.innerHTML = '';
    
    // 1. Filter the posts: MUST pass BOTH group AND account filter
    const visiblePosts = postData.filter(post => {
        const passesGroupFilter = !hiddenGroups.has(post.group_id);
        const passesAccountFilter = !hiddenAccounts.has(post.username);
        
        return passesGroupFilter && passesAccountFilter;
    });

    if (visiblePosts.length === 0) {
        feedContainer.innerHTML = '<div class="loading-message">No posts visible. Try enabling more filters above.</div>';
        if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
        }
        return;
    }


    // 2. Loop through filtered data and create HTML elements
    visiblePosts.forEach((post) => {
        const postUrl = post.url;
        
        // Create container and info elements
        const container = document.createElement('div');
        container.classList.add('post-container');

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('account-info');
        // post.group_name is available because it's merged back in loadInstagramFeed
        infoDiv.innerHTML = `
            <strong>@${post.username}</strong> | Group ${post.group_id}: ${post.group_name} | Order ID: ${post.order_id}
        `;
        container.appendChild(infoDiv);

        // Instagram Embed Blockquote structure
        const blockquote = document.createElement('blockquote');
        blockquote.classList.add('instagram-media');
        blockquote.setAttribute('data-instgrm-permalink', postUrl);
        blockquote.setAttribute('data-instgrm-version', '14');
        
        // Required inline styles for Instagram embeds
        Object.assign(blockquote.style, {
            backgroundColor: '#FFF',
            border: '0',
            borderRadius: '3px',
            boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
            margin: '1px',
            maxWidth: '580px',
            padding: '0',
            width: 'calc(100% - 2px)'
        });

        // Inner structure (required by Instagram)
        const innerDiv = document.createElement('div');
        innerDiv.style.padding = '16px';
        const link = document.createElement('a');
        link.setAttribute('href', postUrl);
        link.textContent = 'View this post on Instagram';

        innerDiv.appendChild(link);
        blockquote.appendChild(innerDiv);
        container.appendChild(blockquote);

        feedContainer.appendChild(container);
    });

    // 3. Trigger Instagram's embed script to process the new blockquotes
    setTimeout(() => {
        if (window.instgrm && window.instgrm.Embeds) {
            console.log("Processing Instagram embeds after a short delay...");
            window.instgrm.Embeds.process();
        }
    }, 500); 
}

// Global variable to hold the fetched and sorted data, so we don't refetch on every filter click
let ALL_POST_DATA = []; 
let UNIQUE_GROUPS = new Set();
let UNIQUE_ACCOUNTS = new Set();

/**
 * Main function to load and render the Instagram feed.
 * @param {boolean} initializeData If true (default), fetches data and sets up controls. 
 * If false, just re-renders based on current filters.
 */
async function loadInstagramFeed(initializeData = true) {
    const feedContainer = document.getElementById('instagram-feed');
    
    // Setup Dark Mode on initial load only
    if (initializeData) {
        setupDarkMode();
    }

    if (initializeData) {
        // Only fetch data if it's the initial load
        try {
            feedContainer.innerHTML = '<div class="loading-message">Fetching data...</div>';
            const response = await fetch('feed_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Fetch the new object structure
            const data = await response.json(); 

            const groupDefinitions = data.groups || []; 
            const rawPosts = data.posts || [];

            // 1. Map group definitions for quick lookup (group_id -> group_name)
            const groupMap = new Map(groupDefinitions.map(g => [g.id, g.name]));
            
            // 2. Merge posts with their group names and gather unique accounts
            ALL_POST_DATA = rawPosts.map(post => {
                const groupName = groupMap.get(post.group_id) || 'Unknown Group';
                // Gather unique accounts here
                UNIQUE_ACCOUNTS.add(post.username); 
                return {
                    ...post,
                    // Add group_name to the post object for consistent rendering and filtering
                    group_name: groupName 
                };
            });

            // 3. Sort the posts by order_id
            ALL_POST_DATA.sort((a, b) => a.order_id.localeCompare(b.order_id));

            // 4. Set unique groups from the definition list
            UNIQUE_GROUPS = new Set(groupDefinitions.map(g => ({ id: g.id, name: g.name })));
            
        } catch (error) {
            console.error('Error loading the Instagram feed:', error);
            feedContainer.innerHTML = `<div class="loading-message" style="color: red;">Error: Could not load feed data. Please ensure 'feed_data.json' exists and is valid.</div>`;
            return;
        }
    }

    // 5. Load filter preferences
    const hiddenGroups = loadHiddenGroups();
    const hiddenAccounts = loadHiddenAccounts();
    
    // 6. Create filter UI (only re-create the buttons if it's the initial data load)
    if (initializeData) {
        // Pass the collected unique group data
        createGroupToggles(UNIQUE_GROUPS, hiddenGroups);
        createAccountToggles(UNIQUE_ACCOUNTS, hiddenAccounts);
    }

    // 7. Apply filters and render
    applyFiltersAndRender(ALL_POST_DATA, hiddenGroups, hiddenAccounts);
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => loadInstagramFeed(true));
