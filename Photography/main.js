// Populate the categories on the main photography page by reading images.csv
async function loadCategories() {
    const container = document.getElementById('categories');
    if (!container) return;

    try {
        const res = await fetch('images.csv');
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (!lines.length) return;

        const header = lines.shift().split(',').map(h => h.trim().toLowerCase());
        const catIdx = header.findIndex(h => h === 'category');

        const cats = new Set();
        lines.forEach(line => {
            // basic CSV column split (file's CSV is simple: path,name,category)
            const cols = line.split(',');
            if (catIdx >= 0 && cols.length > catIdx) {
                const raw = cols[catIdx].trim().replace(/^"|"$/g, '');
                if (raw) cats.add(raw);
            }
        });

        // Sort categories for stable display
        const sorted = Array.from(cats).sort((a, b) => a.localeCompare(b));

        // Add an "All" link first
        const allLink = document.createElement('a');
        allLink.href = 'filmstrip.html';
        allLink.className = 'category-link';
        allLink.textContent = 'All';
        container.appendChild(allLink);

        sorted.forEach(cat => {
            const a = document.createElement('a');
            a.href = `filmstrip.html?category=${encodeURIComponent(cat)}`;
            a.className = 'category-link';
            a.textContent = cat;
            container.appendChild(a);
        });

    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

// Kick off
document.addEventListener('DOMContentLoaded', loadCategories);
