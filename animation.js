
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('constellation-bg');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to full size of container
    function resizeCanvas() {
        const heroSection = canvas.parentElement;
        canvas.width = heroSection.offsetWidth;
        canvas.height = heroSection.offsetHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particle settings
    const particleCount = 100;
    const particles = [];
    const connectionDistance = 150;
    const mouseInfluenceRadius = 100;
    const mouseRepelStrength = 0.1;
    
    let mouse = {
        x: null,
        y: null,
        radius: mouseInfluenceRadius
    };
    
    // Track mouse position
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mouseleave', function() {
        mouse.x = null;
        mouse.y = null;
    });
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 1,
            vx: Math.random() * 0.25 - 0.125,
            vy: Math.random() * 0.25 - 0.125,
            color: '#0078d4'
        });
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];
            
            // Move particles
            p.x += p.vx;
            p.y += p.vy;
            
            // Boundary check
            if (p.x < 0 || p.x > canvas.width) p.vx = -p.vx;
            if (p.y < 0 || p.y > canvas.height) p.vy = -p.vy;
            
            // Mouse interaction
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mouseInfluenceRadius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (mouseInfluenceRadius - distance) / mouseInfluenceRadius;
                    
                    p.vx -= Math.cos(angle) * force * mouseRepelStrength;
                    p.vy -= Math.sin(angle) * force * mouseRepelStrength;
                }
            }
            
            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            
            // Connect particles
            for (let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < connectionDistance) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    
                    // Line opacity based on distance
                    const opacity = 1 - (distance / connectionDistance);
                    ctx.strokeStyle = `rgba(0, 120, 212, ${opacity * 0.5})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
});