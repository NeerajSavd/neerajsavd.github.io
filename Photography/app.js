// --- CONFIG & STATE ---
const state = {
    view: 'home', // 'home' | 'gallery'
    images: [],
    scroll: {
        current: 0,
        target: 0,
        max: 0
    },
    activeIndex: -1,
    rafId: null
};

const dom = {
    app: document.getElementById('app-container'),
    body: document.body,
    track: document.getElementById('track'),
    thumbTrack: document.getElementById('thumb-track'),
    galleryTitle: document.getElementById('gallery-title'),
    categories: document.querySelectorAll('.category-block'),
    backBtn: document.getElementById('back-btn'),
    homeView: document.getElementById('view-home') 
};

document.addEventListener('DOMContentLoaded', () => {
    if (dom.homeView) {
        dom.homeView.addEventListener('scroll', requestParallax);
    }
    
    dom.categories.forEach(cat => {
        cat.addEventListener('click', () => {
            const categoryName = cat.dataset.category;
            openGallery(categoryName);
        });
    });

    dom.backBtn.addEventListener('click', closeGallery);

    window.addEventListener('resize', calculateDimensions);
    window.addEventListener('wheel', handleWheel);
});

async function openGallery(category) {
    const success = await loadImagesForCategory(category);
    if (!success) return;
    
    dom.galleryTitle.innerText = category;
    
    dom.body.classList.add('gallery-mode');
    state.view = 'gallery';
    
    state.activeIndex = -1;
    state.scroll.target = 0; 
    state.scroll.current = 0;
    
    calculateDimensions();
    
    if(!state.rafId) animate();
}

function closeGallery() {
    dom.body.classList.remove('gallery-mode');
    state.view = 'home';
}


async function loadImagesForCategory(category) {
    try {
        dom.track.innerHTML = '';
        dom.thumbTrack.innerHTML = '';
        
        const txt = await (await fetch('images.csv')).text();
        const rows = parseCSV(txt);
        
        const catLower = category.toLowerCase();
        const matched = rows.filter(r => {
            const cval = (r.category || r.Category || '').toString().toLowerCase();
            return cval === catLower;
        });

        // matched.sort((a, b) => extractNumber(a) - extractNumber(b));
        
        state.images = matched.map(r => r.path || r.Path || '').filter(Boolean);

        if(state.images.length === 0) {
            console.warn('No images found');
            return false;
        }

        state.images.forEach((src, i) => {
            const img = document.createElement('img');
            img.src = src;
            img.classList.add('gallery-image');
            img.draggable = false;
            img.addEventListener('click', () => centerImage(i));
            dom.track.appendChild(img);

            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.classList.add('thumb-img');
            thumb.addEventListener('click', () => centerImage(i));
            dom.thumbTrack.appendChild(thumb);
        });

        setTimeout(() => {
            calculateDimensions();
            if (state.images.length > 0) centerImage(0); 
        }, 100);

        return true;

    } catch (err) {
        console.error('Error loading CSV', err);
        return false;
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const header = lines.shift().split(',').map(h => h.trim());
    return lines.map(line => {
        const values = [];
        let current = ''; 
        let inQuotes = false;
        for (let char of line) {
            if (char === '"') { inQuotes = !inQuotes; continue; }
            if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
            current += char;
        }
        values.push(current.trim());
        const obj = {};
        header.forEach((h, i) => obj[h] = values[i] || '');
        return obj;
    });
}

function extractNumber(item) {
    const src = (item.path || item.Path || '').toString();
    const matches = src.match(/\d+/g);
    return matches ? parseInt(matches[matches.length-1]) : 0;
}

function requestParallax() {
    if(state.view !== 'home') return;
    window.requestAnimationFrame(() => {
        dom.categories.forEach(cat => {
            const img = cat.querySelector('.category-img');
            const rect = cat.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const speed = 0.3;
                const yPos = (window.innerHeight - rect.top) * speed;
                img.style.transform = `translateY(${yPos - 200}px)`;
            }
        });
    });
}

function calculateDimensions() {
    if(state.view !== 'gallery') return;
    const trackWidth = dom.track.scrollWidth;
    state.scroll.max = Math.max(0, trackWidth - window.innerWidth + (window.innerWidth/2)); 
}

function handleWheel(e) {
    if(state.view !== 'gallery') return;
    state.scroll.target += e.deltaY * 1.5;
}

function centerImage(index) {
    const imgs = dom.track.querySelectorAll('.gallery-image');
    if(!imgs[index]) return;
    
    const targetImg = imgs[index];
    const screenCenter = window.innerWidth / 2;
    const imgCenter = targetImg.offsetLeft + (targetImg.offsetWidth / 2);
    
    state.scroll.target = imgCenter - screenCenter;
}

function animate() {
    if(state.view === 'gallery') {
        state.scroll.target = Math.max(-500, Math.min(state.scroll.target, state.scroll.max + 500)); 

        state.scroll.current += (state.scroll.target - state.scroll.current) * 0.08;

        dom.track.style.transform = `translate3d(${-state.scroll.current}px, 0, 0)`;

        highlightActive();
    }
    
    state.rafId = requestAnimationFrame(animate);
}

function highlightActive() {
    const centerLine = state.scroll.current + (window.innerWidth / 2);
    const imgs = dom.track.querySelectorAll('.gallery-image');
    const thumbs = dom.thumbTrack.querySelectorAll('.thumb-img');
    
    let closestIndex = -1;
    let minDist = Infinity;

    imgs.forEach((img, i) => {
        const center = img.offsetLeft + (img.offsetWidth / 2);
        const dist = Math.abs(center - centerLine);
        if(dist < minDist) {
            minDist = dist;
            closestIndex = i;
        }
    });

    if (closestIndex !== state.activeIndex && closestIndex !== -1) {
        if(state.activeIndex !== -1 && imgs[state.activeIndex]) {
            imgs[state.activeIndex].classList.remove('active');
            if(thumbs[state.activeIndex]) thumbs[state.activeIndex].classList.remove('active');
        }
        
        imgs[closestIndex].classList.add('active');
        if(thumbs[closestIndex]) thumbs[closestIndex].classList.add('active');
        
        state.activeIndex = closestIndex;
        
        centerThumbnail(closestIndex);
    }
}

function centerThumbnail(index) {
    const thumbs = dom.thumbTrack.querySelectorAll('.thumb-img');
    const target = thumbs[index];
    if(!target) return;
    
    const center = target.offsetLeft + (target.offsetWidth / 2);
    dom.thumbTrack.style.transform = `translate3d(${-center}px, 0, 0)`;
}