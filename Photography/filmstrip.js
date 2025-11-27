const categoryContainer = document.querySelector('.category-container');
const galleryContainer = document.querySelector('.gallery-container');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.close-btn');
const backBtn = document.getElementById('back-btn');

// Will hold the image srcs used by the gallery
let images = [];

// Basic CSV parser supporting quoted fields.
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const header = lines.shift().split(',').map(h => h.trim());

    function parseLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        values.push(current.trim());
        return values;
    }

    return lines.map(line => {
        const cols = parseLine(line);
        const obj = {};
        header.forEach((h, idx) => {
            obj[h] = cols[idx] || '';
        });
        // Normalize tags/categories: support fields named 'tags', 'category', or similar
        const rawTags = (obj.tags || obj.Tags || obj.category || obj.Category || obj.tag || obj.Tag || '').toString().trim();
        const splitTags = rawTags === '' ? [] : rawTags.split(/\||;|\s*,\s*/).map(t => t.trim()).filter(Boolean);
        // If category field exists and is a single word, ensure it's represented as an array
        obj.tagsArray = splitTags.length ? splitTags.map(t => t.toLowerCase()) : [];
        return obj;
    });
}

// Extract the last numeric group from a path/name (returns 0 if none)
function extractNumericSuffixFromItem(item) {
    const src = (item.path || item.Path || item.name || '').toString();
    const matches = src.match(/\d+/g);
    return matches && matches.length ? parseInt(matches[matches.length - 1], 10) : 0;
}

const track = document.getElementById('track');
const thumbTrack = document.getElementById('thumb-track');

// STATE
let scrollAmount = 0;
let currentScroll = 0;
let targetScroll = 0;
let maxScroll = 0;

// 1. INITIALIZE GALLERY
function init() {
    images.forEach((src, index) => {
        // Create Main Image
        const img = document.createElement('img');
        img.src = src;
        img.classList.add('gallery-image');
        img.draggable = false;
        // Click to center logic
        img.addEventListener('click', () => centerImage(index));
        track.appendChild(img);

        // Create Thumbnail
        const thumb = document.createElement('img');
        thumb.src = src;
        thumb.classList.add('thumb-img');
        thumb.addEventListener('click', () => centerImage(index));
        thumbTrack.appendChild(thumb);
    });

    // Recalculate dimensions once images have loaded (avoid arbitrary timeout)
    let imagesLoaded = 0;
    const totalImages = images.length;
    const galleryImgs = track.querySelectorAll('img');
    galleryImgs.forEach(imgEl => {
        if (imgEl.complete) {
            imagesLoaded++;
        } else {
            imgEl.addEventListener('load', () => {
                imagesLoaded++;
                if (imagesLoaded === totalImages) calculateDimensions();
            });
        }
    });
    // If all images were already complete, calculate now
    if (imagesLoaded === totalImages) calculateDimensions();
}

// 2. SCROLL LOGIC
function calculateDimensions() {
    // Ensure maxScroll is never negative
    maxScroll = Math.max(0, track.scrollWidth - window.innerWidth);
}

window.addEventListener('resize', calculateDimensions);

// Listen for mouse wheel
window.addEventListener('wheel', (e) => {
    targetScroll += e.deltaY; // Vertical scroll moves horizontal
    
    // Clamp values
    // Recalculate dimensions in case layout changed
    calculateDimensions();
    targetScroll = Math.max(0, targetScroll);
    targetScroll = Math.min(maxScroll, targetScroll);
});

// Animation Loop (Lerp for smooth physics)
function animate() {
    // Linear Interpolation: Move current towards target by 5% every frame
    currentScroll += (targetScroll - currentScroll) * 0.05;
    
    // Apply transform
    track.style.transform = `translate3d(-${currentScroll}px, 0, 0)`;

    // Highlight center image logic
    highlightActive();

    requestAnimationFrame(animate);
}

// 3. HELPER FUNCTIONS

// Center specific image
function centerImage(index) {
    const imagesElements = document.querySelectorAll('.gallery-image');
    const targetImage = imagesElements[index];
    
    // Calculate position to center the image
    const screenCenter = window.innerWidth / 2;
    const imageCenter = targetImage.offsetLeft + (targetImage.offsetWidth / 2);
    
    targetScroll = imageCenter - screenCenter;
    
    // Clamp
    targetScroll = Math.max(0, targetScroll);
    targetScroll = Math.min(maxScroll, targetScroll);
}

let activeIndex = -1;

function highlightActive() {
    const centerLine = currentScroll + (window.innerWidth / 2);
    const imagesElements = document.querySelectorAll('.gallery-image');
    const thumbsElements = document.querySelectorAll('.thumb-img');

    let newActiveIndex = -1;
    let minDistance = Infinity;

    // 1. Find which image is closest to the center
    imagesElements.forEach((img, index) => {
        const imgCenter = img.offsetLeft + (img.offsetWidth / 2);
        const distance = Math.abs(centerLine - imgCenter);

        if (distance < minDistance) {
            minDistance = distance;
            newActiveIndex = index;
        }
    });

    // 2. Only update DOM if the active image has changed
    if (newActiveIndex !== activeIndex && newActiveIndex !== -1) {
        // Remove active class from old
        if (activeIndex !== -1) {
            if(imagesElements[activeIndex]) imagesElements[activeIndex].classList.remove('active');
            if(thumbsElements[activeIndex]) thumbsElements[activeIndex].classList.remove('active');
        }

        // Add active class to new
        imagesElements[newActiveIndex].classList.add('active');
        thumbsElements[newActiveIndex].classList.add('active');
        
        // Update State
        activeIndex = newActiveIndex;

        // 3. Move the thumbnail track
        centerThumbnail(newActiveIndex);
    }
}

// NEW HELPER FUNCTION
function centerThumbnail(index) {
    const thumbsContainer = document.querySelector('.thumbnails-container');
    const thumbsElements = document.querySelectorAll('.thumb-img');
    const targetThumb = thumbsElements[index];

    if (!thumbsContainer || !targetThumb) return;

    // Get the center of the container
    const containerCenter = thumbsContainer.offsetWidth / 2;

    // Get the center of the target thumbnail relative to its own left edge
    const thumbHalfWidth = targetThumb.offsetWidth / 2;

    // Calculate position: We want the center of the thumb to be at the center of the container.
    // Logic: -(ThumbPosition + ThumbHalfWidth) + ContainerCenter
    const currentThumbOffset = targetThumb.offsetLeft;
    const scrollPos = -(currentThumbOffset + thumbHalfWidth) + containerCenter;

    // Apply transform to the track
    thumbTrack.style.transform = `translateX(${scrollPos}px)`;
}

// START
// Load images.csv, filter by ?category=... and then start gallery
async function loadAndStart() {
    try {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        const txt = await (await fetch('images.csv')).text();
        const rows = parseCSV(txt);

        // Determine matching rows
        let matched = rows;
        if (category && category.trim() !== '') {
            const catLower = category.toString().toLowerCase();
            matched = rows.filter(r => {
                // match either explicit category column or tagsArray
                const cval = (r.category || r.Category || '').toString().toLowerCase();
                if (cval === catLower) return true;
                if (Array.isArray(r.tagsArray) && r.tagsArray.includes(catLower)) return true;
                return false;
            });
        }

        // Sort by numeric suffix if available
        matched.sort((a, b) => extractNumericSuffixFromItem(a) - extractNumericSuffixFromItem(b));

        images = matched.map(r => (r.path || r.Path || '').toString()).filter(Boolean);

        if (!images.length) {
            // If no images found, still start with empty gallery (could show message later)
            console.warn('No images found for category', category);
        }

        init();
        animate();
    } catch (err) {
        console.error('Failed to load images.csv or initialize gallery:', err);
    }
}

// Start after loading images.csv
loadAndStart();