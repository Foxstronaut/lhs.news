// --- CONSTANTS ---
const LOCAL_STORAGE_KEY_THEME = 'instagram_feed_theme';
const LOCAL_STORAGE_KEY_FILTERS = 'instagram_feed_hidden_accounts';

// --- DARK MODE LOGIC (Uses classes defined in the <style> block of index.html) ---

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
        // Default to dark mode if no preference is found (or if saved is 'dark')
        isDarkMode = true;
        body.classList.add('dark-mode');
        toggle.classList.add('active');
        // Ensure the initial state is explicitly saved as 'dark' if it was null
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
 * Extracts the 1-digit account GROUP ID (first digit of the 2-digit account ID).
 * This is used for filtering.
 * @param {string} id The 6-digit ID string (e.g., "000001").
 * @returns {string} The 1-digit account group ID (e.g., "0").
 */
function extractAccountGroup(id) {
    const accountId = extractAccountId(id); // e.g., '01', '10'
    return accountId.substring(0, 1); // e.g., '0', '1'
}

/**
 * Loads the set of hidden account GROUP IDs from localStorage.
 * @returns {Set<string>} A Set of 1-digit group IDs that are currently hidden.
 */
function loadFilterPreferences() {
    const savedFilters = localStorage.getItem(LOCAL_STORAGE_KEY_FILTERS);
    if (savedFilters) {
        // saved as a JSON string array, e.g., '["0"]'
        try {
            return new Set(JSON.parse(savedFilters));
        } catch (e) {
            console.error("Failed to parse filter preferences:", e);
        }
    }
    return new Set();
}

/**
 * Saves the set of hidden account GROUP IDs to localStorage.
 * @param {Set<string>} hiddenGroups The set of 1-digit group IDs.
 */
function saveFilterPreferences(hiddenGroups) {
    localStorage.setItem(LOCAL_STORAGE_KEY_FILTERS, JSON.stringify(Array.from(hiddenGroups)));
}

/**
 * Creates and attaches the filter toggle buttons to the DOM for account groups.
 * @param {Set<string>} uniqueGroups All unique 1-digit group IDs found in the data.
 * @param {Set<string>} hiddenGroups Group IDs currently marked as hidden.
 * @param {Array<Object>} postData The full list of posts for re-rendering.
 */
function createFilterToggles(uniqueGroups, hiddenGroups, postData) {
    const controlBar = document.getElementById('filter-controls');
    controlBar.innerHTML = '<span class="text-sm font-semibold">Filter Groups:</span>';

    uniqueGroups.forEach(groupId => {
        const button = document.createElement('button');
        
        // Assign a more descriptive name based on group ID
        let groupName = `Group ${groupId}x`;
        if (groupId === '0') groupName = 'Group 0x (Photo, Sport)';
        if (groupId === '1') groupName = 'Group 1x (Tech, Gaming)';

        button.textContent = groupName;
        button.setAttribute('data-group-id', groupId);
        
        // Set initial state based on hiddenGroups
        const isActive = !hiddenGroups.has(groupId);
        if (isActive) {
            button.classList.add('active');
        }

        button.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-group-id');
            const isActiveState = e.target.classList.contains('active');
            
            // Toggle the state and update localStorage
            if (isActiveState) {
                hiddenGroups.add(id);
                e.target.classList.remove('active');
            } else {
                hiddenGroups.delete(id);
                e.target.classList.add('active');
            }

            saveFilterPreferences(hiddenGroups);
            // Rerender the feed with new filters
            applyFiltersAndRender(postData, hiddenGroups);
        });

        controlBar.appendChild(button);
    });
}

/**
 * Filters the post data and generates the HTML to render the feed.
 * @param {Array<Object>} postData The full list of sorted posts.
 * @param {Set<string>} hiddenGroups Group IDs that should be hidden.
 */
function applyFiltersAndRender(postData, hiddenGroups) {
    const feedContainer = document.getElementById('instagram-feed');
    feedContainer.innerHTML = '';
    
    // 1. Filter the posts
    const visiblePosts = postData.filter(post => {
        const groupId = extractAccountGroup(post.id);
        return !hiddenGroups.has(groupId);
    });

    if (visiblePosts.length === 0) {
        feedContainer.innerHTML = '<div class="loading-message">No posts visible. Try enabling filters above.</div>';
        // Trigger process() just in case the loading message covers an existing embed
        if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
        }
        return;
    }


    // 2. Loop through filtered data and create HTML elements
    visiblePosts.forEach((post, index) => {
        const postUrl = post.url;
        const accountId = extractAccountId(post.id);
        const groupId = extractAccountGroup(post.id);
        
        // Create container and info elements
        const container = document.createElement('div');
        container.classList.add('post-container');

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('account-info');
        infoDiv.innerHTML = `
            <strong>ID:</strong> ${post.id} (Order: ${post.id.substring(0, 4)} | Group: ${groupId} | Account: ${accountId})
        `;
        container.appendChild(infoDiv);

        // Instagram Embed Blockquote structure
        const blockquote = document.createElement('blockquote');
        blockquote.classList.add('instagram-media');
        blockquote.setAttribute('data-instgrm-permalink', postUrl);
        blockquote.setAttribute('data-instgrm-version', '14');
        // Instagram requires these inline styles for proper rendering
        blockquote.style.backgroundColor = '#FFF';
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
        // NOTE: This assumes 'feed_data.json' is available in the same directory.
        const response = await fetch('feed_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let postData = await response.json();

        // 2. Sort the posts based on the full 6-digit ID (order)
        postData.sort((a, b) => {
            // String comparison works due to consistent zero-padding
            return a.id.localeCompare(b.id);
        });

        // 3. Identify all unique account GROUPS for filter creation (first digit of account ID)
        const uniqueGroups = new Set();
        postData.forEach(post => {
            uniqueGroups.add(extractAccountGroup(post.id));
        });

        // 4. Load filter preferences
        const hiddenGroups = loadFilterPreferences();
        
        // 5. Create filter UI
        createFilterToggles(uniqueGroups, hiddenGroups, postData);

        // 6. Initial render (apply filters)
        applyFiltersAndRender(postData, hiddenGroups);

    } catch (error) {
        console.error('Error loading the Instagram feed:', error);
        feedContainer.innerHTML = `<div class="loading-message" style="color: red;">Error: Could not load feed data. Check console for details.</div>`;
    }
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadInstagramFeed);
