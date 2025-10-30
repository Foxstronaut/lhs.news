// --- CONSTANTS ---
const LOCAL_STORAGE_KEY_THEME = 'instagram_feed_theme';
const LOCAL_STORAGE_KEY_FILTERS = 'instagram_feed_hidden_accounts';

// --- DARK MODE LOGIC ---

/**
 * Sets up the dark mode toggle and loads the saved theme preference.
 */
function setupDarkMode() {
    const body = document.body;
    const toggle = document.getElementById('dark-mode-toggle');

    // 1. Load saved preference
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME);
    let isDarkMode = savedTheme === 'dark';

    // Apply initial state
    if (isDarkMode) {
        body.classList.add('dark-mode');
        toggle.classList.add('active');
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
 * Extracts the 2-digit account ID from the 6-digit post ID.
 * The ID structure is [4-digit order][2-digit account].
 * @param {string} id The 6-digit ID string (e.g., "000001").
 * @returns {string} The 2-digit account ID (e.g., "01").
 */
function extractAccountId(id) {
    if (id && id.length === 6) {
        return id.substring(4);
    }
    return '00'; // Default for malformed IDs
}

/**
 * Loads the set of hidden account IDs from localStorage.
 * @returns {Set<string>} A Set of 2-digit account IDs that are currently hidden.
 */
function loadFilterPreferences() {
    const savedFilters = localStorage.getItem(LOCAL_STORAGE_KEY_FILTERS);
    if (savedFilters) {
        // saved as a JSON string array, e.g., '["02"]'
        try {
            return new Set(JSON.parse(savedFilters));
        } catch (e) {
            console.error("Failed to parse filter preferences:", e);
        }
    }
    return new Set();
}

/**
 * Saves the set of hidden account IDs to localStorage.
 * @param {Set<string>} hiddenAccounts The set of hidden account IDs.
 */
function saveFilterPreferences(hiddenAccounts) {
    localStorage.setItem(LOCAL_STORAGE_KEY_FILTERS, JSON.stringify(Array.from(hiddenAccounts)));
}

/**
 * Creates and attaches the filter toggle buttons to the DOM.
 * @param {Set<string>} uniqueAccounts All unique 2-digit account IDs found in the data.
 * @param {Set<string>} hiddenAccounts Account IDs currently marked as hidden.
 * @param {Array<Object>} postData The full list of posts for re-rendering.
 */
function createFilterToggles(uniqueAccounts, hiddenAccounts, postData) {
    const controlBar = document.getElementById('filter-controls');
    controlBar.innerHTML = '<span>Filter Accounts:</span>';

    uniqueAccounts.forEach(accountId => {
        const button = document.createElement('button');
        
        // Assign a more descriptive name based on account ID for the demo
        let accountName = `Account ${accountId}`;
        if (accountId === '01') accountName = 'Photography (01)';
        if (accountId === '02') accountName = 'Sports (02)';

        button.textContent = accountName;
        button.setAttribute('data-account-id', accountId);
        
        // Set initial state based on hiddenAccounts
        const isActive = !hiddenAccounts.has(accountId);
        if (isActive) {
            button.classList.add('active');
        }

        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-account-id');
            const isActiveState = e.target.classList.contains('active');
            
            // Toggle the state and update localStorage
            if (isActiveState) {
                hiddenAccounts.add(id);
                e.target.classList.remove('active');
            } else {
                hiddenAccounts.delete(id);
                e.target.classList.add('active');
            }

            saveFilterPreferences(hiddenAccounts);
            applyFiltersAndRender(postData, hiddenAccounts);
        });

        controlBar.appendChild(button);
    });
}

/**
 * Filters the post data and generates the HTML to render the feed.
 * @param {Array<Object>} postData The full list of sorted posts.
 * @param {Set<string>} hiddenAccounts Account IDs that should be hidden.
 */
function applyFiltersAndRender(postData, hiddenAccounts) {
    const feedContainer = document.getElementById('instagram-feed');
    feedContainer.innerHTML = '';
    
    // 1. Filter the posts
    const visiblePosts = postData.filter(post => {
        const accountId = extractAccountId(post.id);
        return !hiddenAccounts.has(accountId);
    });

    if (visiblePosts.length === 0) {
        feedContainer.innerHTML = '<div class="loading-message">No posts visible. Try enabling filters above.</div>';
        // Need to run process() just in case, though unlikely to change anything
        if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
        }
        return;
    }


    // 2. Loop through filtered data and create HTML elements
    visiblePosts.forEach((post, index) => {
        const postUrl = post.url;
        const accountId = extractAccountId(post.id);
        
        // Create container and info elements
        const container = document.createElement('div');
        container.classList.add('post-container');

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('account-info');
        infoDiv.innerHTML = `
            <strong>ID:</strong> ${post.id} (Order: ${post.id.substring(0, 4)} | Account: ${accountId})
        `;
        container.appendChild(infoDiv);

        // Instagram Embed Blockquote structure
        const blockquote = document.createElement('blockquote');
        blockquote.classList.add('instagram-media');
        blockquote.setAttribute('data-instgrm-permalink', postUrl);
        blockquote.setAttribute('data-instgrm-version', '14');
        // Inline styles for blockquote (required for proper display, and cannot use CSS variables here)
        blockquote.style.backgroundColor = '#FFF'; // Must be set to white for Instagram to work
        blockquote.style.border = '0';
        blockquote.style.borderRadius = '3px';
        blockquote.style.boxShadow = '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)';
        blockquote.style.margin = '1px';
        blockquote.style.maxWidth = '580px';
        blockquote.style.padding = '0';
        blockquote.style.width = 'calc(100% - 2px)';

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
    // Use a short delay to ensure the DOM is fully settled
    setTimeout(() => {
        if (window.instgrm && window.instgrm.Embeds) {
            console.log("Processing Instagram embeds after a short delay...");
            window.instgrm.Embeds.process();
        }
    }, 500); // Wait 500ms (0.5 seconds)
}

// --- MAIN ENTRY POINT ---

async function loadInstagramFeed() {
    const feedContainer = document.getElementById('instagram-feed');
    
    // Setup Dark Mode immediately
    setupDarkMode();

    try {
        // 1. Fetch and process the data
        const response = await fetch('feed_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let postData = await response.json();

        // 2. Sort the posts based on the first 4 digits of the ID (order)
        postData.sort((a, b) => {
            // Compare the full 6-digit ID strings lexicographically
            // Since they are padded with '0', string comparison works for numerical sort.
            return a.id.localeCompare(b.id);
        });

        // 3. Identify all unique accounts for filter creation
        const uniqueAccounts = new Set();
        postData.forEach(post => {
            uniqueAccounts.add(extractAccountId(post.id));
        });

        // 4. Load filter preferences
        const hiddenAccounts = loadFilterPreferences();
        
        // 5. Create filter UI
        createFilterToggles(uniqueAccounts, hiddenAccounts, postData);

        // 6. Initial render (apply filters)
        applyFiltersAndRender(postData, hiddenAccounts);

    } catch (error) {
        console.error('Error loading the Instagram feed:', error);
        feedContainer.innerHTML = `<div class="loading-message" style="color: red;">Error: Could not load feed data. Check console for details.</div>`;
    }
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadInstagramFeed);
