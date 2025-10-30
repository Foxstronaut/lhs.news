// Function to fetch the JSON data and build the feed
async function loadInstagramFeed() {
    const feedContainer = document.getElementById('instagram-feed');
    feedContainer.innerHTML = '<div class="loading-message">Fetching data and building feed...</div>'; // Update loading message

    try {
        // 1. Fetch the JSON data from the file
        const response = await fetch('feed_data.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const postData = await response.json();

        // 2. Sort the posts based on the 'id' (priority) in descending order
        const sortedPosts = postData.sort((a, b) => b.id - a.id);

        // 3. Clear the container before adding posts
        feedContainer.innerHTML = '';

        // 4. Loop through sorted data and create HTML elements
        sortedPosts.forEach(post => {
            const postUrl = post.url;
            const postId = post.id.toString();

            // Extract the priority (first 6 digits) and account ID (last 4 digits)
            const priority = postId.substring(0, 6);
            const accountId = postId.substring(6);

            // Create container and info elements
            const container = document.createElement('div');
            container.classList.add('post-container');

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('account-info');
            infoDiv.innerHTML = `
                **Order Priority:** ${priority} | **Source Account ID:** ${accountId}
            `;
            container.appendChild(infoDiv);

            // Instagram Embed Blockquote structure
            const blockquote = document.createElement('blockquote');
            blockquote.classList.add('instagram-media');
            blockquote.setAttribute('data-instgrm-permalink', postUrl);
            blockquote.setAttribute('data-instgrm-version', '14');
            // ... (keep the same inline styles for the blockquote)
            blockquote.style.backgroundColor = '#FFF';
            blockquote.style.border = 0;
            blockquote.style.borderRadius = '3px';
            blockquote.style.boxShadow = '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)';
            blockquote.style.margin = '1px';
            blockquote.style.maxWidth = '580px';
            blockquote.style.padding = 0;
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

        // 5. Trigger Instagram's embed script to process the new blockquotes
        // This is necessary because the content was added dynamically after page load.
        if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
        } else {
            // Fallback for slower script loading
            window.addEventListener('load', () => {
                if (window.instgrm && window.instgrm.Embeds) {
                    window.instgrm.Embeds.process();
                }
            });
        }

    } catch (error) {
        console.error('Error loading the Instagram feed:', error);
        feedContainer.innerHTML = `<div class="loading-message" style="color: red;">Error: Could not load feed data. Check console for details. (Tip: You may need to run this on a local server.)</div>`;
    }
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadInstagramFeed);
