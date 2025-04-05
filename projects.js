// Script to load projects from your text file
document.addEventListener('DOMContentLoaded', function() {
    // Fetch the projects.txt file
    fetch('projects.txt')
        .then(response => response.text())
        .then(data => {
            console.log('loading projects.txt:');
            // Parse the data according to your file format
            const projects = parseProjectData(data);
            
            // Clear the placeholder projects
            document.getElementById('projects-container').innerHTML = '';
            
            // Add each project to the page
            projects.forEach(project => {
                addProjectToPage(project);
            });
        })
        .catch(error => {
            console.error('Error loading projects.txt:', error);
        });
});

function parseProjectData(data) {
    // This function should parse your text file format
    // Example implementation (adjust based on your actual file format):
    const projects = [];
    const projectBlocks = data.split('\n\n');
    console.log('projectBlocks.length:', projectBlocks.length);
    
    projectBlocks.forEach(block => {
        if (!block.trim()) return;
        
        const lines = block.split('\n');
        const project = {
            technologies: []
        };
        
        lines.forEach(line => {
            if (line.includes(':')) {
                const [key, value] = line.split(/:(.*)/s);
                
                if (key === 'technologies') {
                    project.technologies = value.split(',');
                } else {
                    project[key] = value;
                }
            }
        });
        
        if (project.title) {
            projects.push(project);
        }
    });
    console.log('projects:', projects);
    return projects;
}

function addProjectToPage(project) {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    
    // Create technologies HTML
    const techHTML = project.technologies.map(tech => 
        `<span class="technology">${tech}</span>`
    ).join('');
    
    // Set the HTML content
    projectCard.innerHTML = `
        <div class="project-info">
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="technologies">
                ${techHTML}
            </div>
        </div>
    `;
    
    // Add click event to show modal
    projectCard.addEventListener('click', () => {
        showProjectModal(project);
    });
    
    // Add to the container
    document.getElementById('projects-container').appendChild(projectCard);
}

// Add this modal container to your HTML
function addModalContainer() {
    if (!document.getElementById('project-modal-container')) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'project-modal-container';
        modalContainer.className = 'modal-container';
        modalContainer.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="modal-body"></div>
            </div>
        `;
        document.body.appendChild(modalContainer);
        
        // Add close functionality
        const closeBtn = modalContainer.querySelector('.close-modal');
        closeBtn.addEventListener('click', closeModal);
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) closeModal();
        });
    }
}

// Call this when your page loads
document.addEventListener('DOMContentLoaded', addModalContainer);

// Function to show the modal with project details
function showProjectModal(project) {
    const modalContainer = document.getElementById('project-modal-container');
    const modalBody = modalContainer.querySelector('.modal-body');
    
    // Create technologies HTML for modal
    const techHTML = project.technologies.map(tech => 
        `<span class="technology">${tech}</span>`
    ).join('');
    
    // Set modal content
    modalBody.innerHTML = `
        <div class="modal-image">
            <img src="${project.image || 'placeholder.jpg'}" alt="${project.title}">
        </div>
        <h2>${project.title}</h2>
        <div class="modal-technologies">
            ${techHTML}
        </div>
        <div class="modal-description">
            ${project.fullDescription || project.description}
        </div>
        <div class="modal-links">
            ${project.link ? `<a href="${project.link}" target="_blank" class="project-link">View Project</a>` : ''}
        </div>
    `;
    
    // Show the modal with animation
    modalContainer.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Function to close the modal
function closeModal() {
    const modalContainer = document.getElementById('project-modal-container');
    modalContainer.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}