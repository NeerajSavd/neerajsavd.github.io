document.addEventListener('DOMContentLoaded', function() {
    fetch('projects.txt')
        .then(response => response.text())
        .then(data => {
            console.log('loading projects.txt:');
            const projects = parseProjectData(data);

            document.getElementById('projects-spotlight').innerHTML = '';
            // spotlight first 2 projects
            const spotlightProjects = projects.slice(0, 2);
            spotlightProjects.forEach(project => {
                addProjectSpotLightToPage(project);
            });

            document.getElementById('projects-container').innerHTML = '';
            const remainingProjects = projects.slice(2);
            remainingProjects.forEach(project => {
                addProjectToPage(project);
            });
        })
        .catch(error => {
            console.error('Error loading projects.txt:', error);
        });
});

function parseProjectData(data) {
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

function addProjectSpotLightToPage(project) {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    
    const techHTML = project.technologies.map(tech => 
        `<span class="technology">${tech}</span>`
    ).join('');
    
    projectCard.innerHTML = `
        <div class="project-info">
            <div class="project-image">
                <img src="${project.image || 'placeholder.jpg'}" alt="${project.title}">
            </div>
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="technologies">
                ${techHTML}
            </div>
        </div>
    `;
    
    projectCard.addEventListener('click', () => {
        showProjectModal(project);
    });
    
    document.getElementById('projects-spotlight').appendChild(projectCard);
}

function addProjectToPage(project) {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    
    const techHTML = project.technologies.map(tech => 
        `<span class="technology">${tech}</span>`
    ).join('');
    
    projectCard.innerHTML = `
        <div class="project-info">
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="technologies">
                ${techHTML}
            </div>
        </div>
    `;
    
    projectCard.addEventListener('click', () => {
        showProjectModal(project);
    });
    
    document.getElementById('projects-container').appendChild(projectCard);
}

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
        
        const closeBtn = modalContainer.querySelector('.close-modal');
        closeBtn.addEventListener('click', closeModal);
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) closeModal();
        });
    }
}

document.addEventListener('DOMContentLoaded', addModalContainer);

function showProjectModal(project) {
    const modalContainer = document.getElementById('project-modal-container');
    const modalBody = modalContainer.querySelector('.modal-body');
    
    const techHTML = project.technologies.map(tech => 
        `<span class="technology">${tech}</span>`
    ).join('');
    
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
            ${project.link ? `<a href="${project.link}" target="_blank" class="btn">View Project</a>` : ''}
        </div>
    `;
    
    modalContainer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modalContainer = document.getElementById('project-modal-container');
    modalContainer.classList.remove('active');
    document.body.style.overflow = '';
}