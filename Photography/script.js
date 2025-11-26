const categoryContainer = document.querySelector('.category-container');
const galleryContainer = document.querySelector('.gallery-container');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.close-btn');
const backBtn = document.getElementById('back-btn');

// runtime guards to avoid errors when elements are missing
if (!galleryContainer) {
	// nothing to do if the gallery container is missing
	console.warn('Gallery container not found — gallery will not initialize.');
}

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

// helper: return first tag (lowercased) or empty string
function getFirstTag(obj) {
	const arr = obj && obj.tagsArray;
	return (Array.isArray(arr) && arr.length) ? arr[0] : '';
}

// Extract the last numeric group from a path/name (returns 0 if none)
function extractNumericSuffixFromItem(item) {
    const src = (item.path || item.Path || item.name || '').toString();
    const matches = src.match(/\d+/g);
    return matches && matches.length ? parseInt(matches[matches.length - 1], 10) : 0;
}

function createGalleryItem(item) {
    const itemDiv = document.createElement('div');
	itemDiv.className = 'gallery-item';
    itemDiv.setAttribute('data-tags', item.tagsArray.join(' '));
    if (item.tagsArray.length > 0) itemDiv.setAttribute('data-category', item.tagsArray[0]);

    const imgEl = document.createElement('img');
    imgEl.src = item.path;
    imgEl.alt = item.name || '';
    itemDiv.appendChild(imgEl);


    // click -> open lightbox
    itemDiv.addEventListener('click', () => {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = imgEl.src;
        lightbox.style.display = 'flex';
    });

    return itemDiv;
}

function renderGallery(items) {
	if (!galleryContainer) return;
	galleryContainer.innerHTML = '';
	items.forEach(it => {
		const node = createGalleryItem(it);
		galleryContainer.appendChild(node);
	});

	// After new items are rendered, observe them for scroll-reveal animation
	observeGalleryItems();
}

// Observe gallery items and add `.in-view` when they enter the viewport.
function observeGalleryItems() {
	const items = document.querySelectorAll('.gallery-item');
	if (!items || items.length === 0) return;

	const observer = new IntersectionObserver((entries, obs) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('in-view');
				obs.unobserve(entry.target);
			}
		});
	}, { threshold: 0.12 });

	items.forEach((el, idx) => {
		// add a small stagger for nicer effect
		const delay = Math.min(0.18 + idx * 0.03, 0.5);
		el.style.transitionDelay = `${delay}s`;
		observer.observe(el);
	});
}

// top-level initialization: clearer async flow, preserves behavior
async function init() {
	if (!galleryContainer) return;
	try {
		const resp = await fetch('images.csv');
		if (!resp.ok) throw new Error('Failed to load images.csv');
		const text = await resp.text();
		const items = parseCSV(text);
		const itemsCsvOrder = items.slice();

		// Sort items by numeric suffix (descending) for gallery listing
		items.sort((a, b) => extractNumericSuffixFromItem(b) - extractNumericSuffixFromItem(a));

		// Build category set (use the first tag/category if present)
		const categorySet = new Set();
		items.forEach(it => {
			const ft = getFirstTag(it);
			if (ft) categorySet.add(ft);
		});

		// Build cover map: choose the first (CSV order) image encountered per category
		const coverMap = {};
		itemsCsvOrder.forEach(it => {
			const cat = getFirstTag(it);
			if (!cat) return;
			// only set the cover if we don't already have one for this category
			if (!coverMap[cat]) {
				coverMap[cat] = { path: it.path };
			}
		});

		let DEFAULT_PREVIEW_CAT = (window.DEFAULT_CATEGORY || '').toString().trim().toLowerCase();

		// Create category word list + preview (hover shows a representative image)
		function createCategoryWord(value, label, coverPath, isActive = false) {
			const li = document.createElement('li');
			li.className = 'category-word' + (isActive ? ' active' : '');
			li.setAttribute('data-category', value);
			li.tabIndex = 0;
			li.textContent = label;

			li.addEventListener('mouseenter', () => showPreview(value, coverPath));
			li.addEventListener('focus', () => showPreview(value, coverPath));
			li.addEventListener('mouseleave', hidePreview);
			li.addEventListener('blur', hidePreview);

			li.addEventListener('click', () => openCategory(value, label, li));
			return li;
		}

		// Show preview image for a category value.
		function showPreview(value, coverPath) {
			const previewImgEl = document.getElementById('category-preview-img');
			if (!previewImgEl) return;
			let src = coverPath;
			if (!src) {
				const found = items.find(it => (it.tagsArray || [])[0] === value && it.path);
				if (found) src = found.path;
			}
			if (!src) {
				// nothing to show
				return;
			}

			// resolve to absolute URL for reliable comparison
			let absNewSrc;
			try { absNewSrc = new URL(src, window.location.href).href; } catch (e) { absNewSrc = src; }

			// If same image already showing, do nothing
			if (previewImgEl.src === absNewSrc) return;

			const currentOpacity = parseFloat(getComputedStyle(previewImgEl).opacity || '0');

			// If there's no image yet (first load) or currently hidden, just set and fade in.
			if (!previewImgEl.src || currentOpacity === 0) {
				previewImgEl.src = src;
				// ensure we only show after it's loaded for a smooth fade
				previewImgEl.onload = () => { previewImgEl.style.opacity = '1'; previewImgEl.onload = null; };
				return;
			}

			// Otherwise, fade out, swap src on transitionend, then fade in.
			const onFadeOut = (e) => {
				if (e.propertyName !== 'opacity') return;
				// only act when opacity has reached 0
				if (parseFloat(getComputedStyle(previewImgEl).opacity) > 0) return;
				previewImgEl.removeEventListener('transitionend', onFadeOut);
				// swap image and fade back in once loaded
				previewImgEl.src = src;
				previewImgEl.onload = () => { previewImgEl.style.opacity = '1'; previewImgEl.onload = null; };
			};

			previewImgEl.addEventListener('transitionend', onFadeOut);
			previewImgEl.style.opacity = '0';
		}

		function hidePreview() {
			// keep last image; nothing to do
		}

		function openCategory(value, label, el) {
			// Toggle active state
			const words = document.querySelectorAll('.category-word');
			words.forEach(b => b.classList.remove('active'));
			if (el) el.classList.add('active');

			const filtered = items.filter(it => getFirstTag(it) === value);
			if (categoryContainer) categoryContainer.style.display = 'none';
			if (backBtn) backBtn.style.display = 'inline-block';
			galleryContainer.classList.add('gallery-expanded');
			renderGallery(filtered);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}

		// build category list and preview
		categoryContainer.innerHTML = '';
		const preferredOrder = ['washington', 'nepal', 'hawaii'];
		const otherCats = Array.from(categorySet).filter(c => !preferredOrder.includes(c)).sort();
		const sortedCats = [];
		preferredOrder.forEach(p => { if (categorySet.has(p)) sortedCats.push(p); });
		otherCats.forEach(c => sortedCats.push(c));

		const listEl = document.createElement('ul');
		listEl.className = 'category-list';
		const previewWrap = document.createElement('div');
		previewWrap.className = 'category-preview';
		const previewImg = document.createElement('img');
		previewImg.id = 'category-preview-img';
		previewImg.alt = 'Category preview';
		previewImg.style.opacity = '0';
		previewWrap.appendChild(previewImg);

		DEFAULT_PREVIEW_CAT = categorySet.has('washington') ? 'washington' : DEFAULT_PREVIEW_CAT;

		sortedCats.forEach((cat) => {
			const label = cat.charAt(0).toUpperCase() + cat.slice(1);
			const coverPath = coverMap[cat] ? coverMap[cat].path : undefined;
			const isActive = (cat === DEFAULT_PREVIEW_CAT);
			listEl.appendChild(createCategoryWord(cat, label, coverPath, isActive));
		});

		categoryContainer.appendChild(listEl);
		categoryContainer.appendChild(previewWrap);

		renderGallery([]);

		// handle initial category from URL or DEFAULT_CATEGORY
		const params = new URLSearchParams(window.location.search);
		const catParam = params.get('category');
		const defaultCat = (window.DEFAULT_CATEGORY || '').toString().trim().toLowerCase();
		const initialCategory = defaultCat || (catParam ? catParam.toLowerCase() : null);
		if (initialCategory) {
			const targetBox = Array.from(document.querySelectorAll('.category-word')).find(b => b.getAttribute('data-category') === initialCategory);
			const readableLabel = initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1);
			if (targetBox) {
				targetBox.click();
			} else {
				const filtered = items.filter(it => getFirstTag(it) === initialCategory);
				if (backBtn) {
					backBtn.style.display = 'inline-block';
					backBtn.textContent = `← Back — ${readableLabel}`;
				}
				galleryContainer.classList.add('gallery-expanded');
				renderGallery(filtered);
			}
		}

		// Back button behavior
		if (backBtn) {
			backBtn.style.display = 'none';
			backBtn.addEventListener('click', () => {
				if (categoryContainer) categoryContainer.style.display = '';
				backBtn.style.display = 'none';
				galleryContainer.classList.remove('gallery-expanded');
				const boxes = document.querySelectorAll('.category-word');
				boxes.forEach(b => b.classList.remove('active'));
				renderGallery([]);
				if (history && history.replaceState) {
					const url = new URL(window.location.href);
					url.searchParams.delete('category');
					history.replaceState({}, '', url.toString());
				}
				window.scrollTo({ top: 0, behavior: 'smooth' });
			});
		}
	} catch (err) {
		console.error(err);
		if (galleryContainer) galleryContainer.innerHTML = '<p class="error">Could not load gallery data.</p>';
	}
}

// initialize
init().catch(err => console.error(err));

// LIGHTBOX CLOSE HANDLERS (defensive)
if (closeBtn && lightbox) {
	closeBtn.addEventListener('click', () => {
		lightbox.style.display = 'none';
	});
	lightbox.addEventListener('click', (e) => {
		if (e.target === lightbox) {
			lightbox.style.display = 'none';
		}
	});
	// keyboard: Escape to close lightbox
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && lightbox.style.display === 'flex') {
			lightbox.style.display = 'none';
		}
	});
}