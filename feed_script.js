// Function to fetch the JSON data and build the feed
async function loadInstagramFeed() {
    const feedContainer = document.getElementById('instagram-feed');
    feedContainer.innerHTML = '<div class="loading-message">Fetching data and building feed...</div>';

    try {
        // 1. Fetch the JSON data from the file
        const response = await fetch('feed_data.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const postData = await response.json();

        // 2. The posts are now in the correct order, no sorting needed.
        const sequentialPosts = postData; 
        
        // 3. Clear the container before adding posts
        feedContainer.innerHTML = '';

        // 4. Loop through sequential data and create HTML elements
        sequentialPosts.forEach((post, index) => {
            const postUrl = post.url;
            
            // Create container and info elements (optional: showing the index)
            const container = document.createElement('div');
            container.classList.add('post-container');

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('account-info');
            infoDiv.innerHTML = `
                **Feed Order:** ${index + 1}
            `;
            container.appendChild(infoDiv);

            // Instagram Embed Blockquote structure
            const blockquote = document.createElement('blockquote');
            blockquote.classList.add('instagram-media');
            blockquote.setAttribute('data-instgrm-permalink', postUrl);
            blockquote.setAttribute('data-instgrm-version', '14');
            // Inline styles for blockquote (required for proper display)
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
        if (window.instgrm && window.instgrm.Embeds) {
            window.instgrm.Embeds.process();
        } else {
            window.addEventListener('load', () => {
                if (window.instgrm && window.instgrm.Embeds) {
                    window.instgrm.Embeds.process();
                }
            });
        }

    } catch (error) {
        console.error('Error loading the Instagram feed:', error);
        feedContainer.innerHTML = `<div class="loading-message" style="color: red;">Error: Could not load feed data. Check console for details.</div>`;
    }
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadInstagramFeed);
