// Project Detail Navigation Functionality

// Project data for navigation
const projects = [
    {
        id: 'hypertextedu',
        title: 'HyperText Edu',
        file: 'hypertextedu.html'
    },
    {
        id: 'psychology',
        title: 'Psychology Consultation Management System',
        file: 'PsychologyConsultationManagementSystem.html'
    },
    {
        id: 'supermathsbros',
        title: 'Super Maths Bros',
        file: 'SuperMathsBros.html'
    }
];

// Get current project from URL
function getCurrentProject() {
    const currentPage = window.location.pathname.split('/').pop();
    return projects.find(project => project.file === currentPage);
}

// Get current project index
function getCurrentProjectIndex() {
    const currentProject = getCurrentProject();
    return currentProject ? projects.findIndex(p => p.id === currentProject.id) : -1;
}

// Back to portfolio function
function goBack() {
    // Add smooth transition effect
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '0';
    
    setTimeout(() => {
        // Check if we came from the main page
        if (document.referrer && document.referrer.includes('index.html')) {
            window.history.back();
        } else {
            // Navigate to main page with portfolio section
            window.location.href = 'index.html#portfolio';
        }
    }, 300);
}



// Navigate to specific project with transition
function navigateToProject(projectFile) {
    // Add loading animation
    showLoadingTransition();
    
    setTimeout(() => {
        window.location.href = projectFile;
    }, 500);
}

// Show loading transition
function showLoadingTransition() {
    const overlay = document.createElement('div');
    overlay.className = 'page-transition';
    overlay.innerHTML = `
        <div class="transition-content">
            <div class="transition-spinner"></div>
            <p>Loading project...</p>
        </div>
    `;
    
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(26, 26, 26, 0.95));
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const transitionContent = overlay.querySelector('.transition-content');
    transitionContent.style.cssText = `
        text-align: center;
        color: white;
    `;
    
    const spinner = overlay.querySelector('.transition-spinner');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 107, 53, 0.3);
        border-top: 3px solid #ff6b35;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    `;
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 50);
}

// Enhanced video functionality
function initVideoEnhancements() {
    const videos = document.querySelectorAll('video');
    
    videos.forEach(video => {
        const container = video.closest('.video-container');
        const overlay = container.querySelector('.video-overlay');
        const playButton = container.querySelector('.play-button');
        
        // Custom play button functionality
        if (playButton) {
            playButton.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                    overlay.style.opacity = '0';
                } else {
                    video.pause();
                    overlay.style.opacity = '1';
                }
            });
        }
        
        // Video event listeners
        video.addEventListener('play', () => {
            overlay.style.opacity = '0';
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
        });
        
        video.addEventListener('pause', () => {
            overlay.style.opacity = '1';
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        video.addEventListener('ended', () => {
            overlay.style.opacity = '1';
            playButton.innerHTML = '<i class="fas fa-replay"></i>';
        });
        
        // Click on video to play/pause
        video.addEventListener('click', () => {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        });
    });
}

// Enhanced image gallery functionality
function initImageGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            openLightbox(item, index);
        });
        
        // Add loading animation for images
        const img = item.querySelector('img');
        if (img) {
            img.addEventListener('load', () => {
                item.classList.add('loaded');
            });
        }
    });
}

// Lightbox functionality for images
function openLightbox(item, index) {
    const img = item.querySelector('img');
    const overlay = item.querySelector('.image-overlay');
    
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <button class="lightbox-close">
                <i class="fas fa-times"></i>
            </button>
            <img src="${img.src}" alt="${img.alt}">
            <div class="lightbox-info">
                <h4>${overlay.querySelector('h4').textContent}</h4>
                <p>${overlay.querySelector('p').textContent}</p>
            </div>
            <div class="lightbox-nav">
                <button class="lightbox-prev">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="lightbox-next">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
    
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        backdrop-filter: blur(10px);
    `;
    
    const lightboxContent = lightbox.querySelector('.lightbox-content');
    lightboxContent.style.cssText = `
        position: relative;
        max-width: 90%;
        max-height: 90%;
        text-align: center;
    `;
    
    const lightboxImg = lightbox.querySelector('img');
    lightboxImg.style.cssText = `
        max-width: 100%;
        max-height: 70vh;
        border-radius: 0.5rem;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    `;
    
    const lightboxInfo = lightbox.querySelector('.lightbox-info');
    lightboxInfo.style.cssText = `
        color: white;
        margin-top: 1rem;
    `;
    
    const closeBtn = lightbox.querySelector('.lightbox-close');
    closeBtn.style.cssText = `
        position: absolute;
        top: -40px;
        right: 0;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s ease;
    `;
    
    closeBtn.addEventListener('click', () => {
        closeLightbox(lightbox);
    });
    
    // Close on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox(lightbox);
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeLightbox(lightbox);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
    
    document.body.appendChild(lightbox);
    
    setTimeout(() => {
        lightbox.style.opacity = '1';
    }, 50);
}

// Close lightbox
function closeLightbox(lightbox) {
    lightbox.style.opacity = '0';
    setTimeout(() => {
        if (document.body.contains(lightbox)) {
            document.body.removeChild(lightbox);
        }
    }, 300);
}

// Keyboard navigation
function initKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Only handle navigation if no input is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                goToPreviousProject();
                break;
            case 'ArrowRight':
                e.preventDefault();
                goToNextProject();
                break;
            case 'Escape':
                e.preventDefault();
                goBack();
                break;
        }
    });
}

// Smooth scroll to sections within project page
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');

            // Ignore empty or just "#" links
            if (!targetId || targetId === "#") return;

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();
                const headerOffset = 80; // adjust if you have a fixed navbar
                const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementPosition - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}


// Update navigation button states
function updateNavigationButtons() {
    const currentIndex = getCurrentProjectIndex();
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn && nextBtn) {
        // Update button text with project names
        if (currentIndex > 0) {
            const prevProject = projects[currentIndex - 1];
            prevBtn.querySelector('span').textContent = prevProject.title;
        } else {
            const lastProject = projects[projects.length - 1];
            prevBtn.querySelector('span').textContent = lastProject.title;
        }
        
        if (currentIndex < projects.length - 1) {
            const nextProject = projects[currentIndex + 1];
            nextBtn.querySelector('span').textContent = nextProject.title;
        } else {
            const firstProject = projects[0];
            nextBtn.querySelector('span').textContent = firstProject.title;
        }
    }
}

// Page load animations
function initPageAnimations() {
    // Animate elements on page load
    const animatedElements = document.querySelectorAll(`
        .project-header, .media-section, .content-section, 
        .tech-stack, .project-stats, .project-links
    `);
    
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100 + 200);
    });
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initVideoEnhancements();
    initImageGallery();
    initKeyboardNavigation();
    initSmoothScroll();
    updateNavigationButtons();
    initPageAnimations();
    
    // Add loading class to images
    const images = document.querySelectorAll('.gallery-item img');
    images.forEach(img => {
        if (!img.complete) {
            img.closest('.gallery-item').classList.add('loading');
        }
        
        img.addEventListener('load', () => {
            img.closest('.gallery-item').classList.remove('loading');
            img.closest('.gallery-item').classList.add('loaded');
        });
    });
});

// Add CSS for loading states and animations
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .gallery-item.loading {
        background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    
    .gallery-item.loaded {
        animation: fadeIn 0.5s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .lightbox-close:hover {
        background: rgba(255, 255, 255, 0.2) !important;
    }
    
    .video-container {
        position: relative;
        cursor: pointer;
    }
    
    .video-container:hover {
        transform: scale(1.02);
        transition: transform 0.3s ease;
    }
`;
document.head.appendChild(additionalStyles);

