// Animation Enhancement Script for Modern Registrar Dashboard
// This script adds professional animations to all existing components
   
// 1. Header Animations
document.addEventListener('DOMContentLoaded', function() {
    // Animate header elements on load
    const header = document.querySelector('header');
    if (header) {
        header.classList.add('animate-slide-in-top');
    }
    
    // Animate logo
    const logo = document.querySelector('.w-8.h-8.bg-gradient-to-r');
    if (logo) {
        logo.classList.add('animate-bounce-in');
        setTimeout(() => {
            logo.classList.add('animate-pulse');
        }, 1000);
    }
    
    // Animate title
    const title = document.querySelector('h1');
    if (title) {
        title.classList.add('text-glow', 'animate-fade-in-scale');
    }
    
    // Animate search bar
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
        searchInput.classList.add('animate-slide-in-right', 'form-input');
    }
    
    // Animate buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
        button.classList.add('animate-stagger', `animate-stagger-${index + 1}`, 'interactive-press');
    });
    
    // Animate notification badge
    const notificationBadge = document.querySelector('.animate-ping');
    if (notificationBadge) {
        notificationBadge.classList.add('notification-pulse');
    }
});

// 2. Sidebar Animations
function animateSidebar() {
    const sidebar = document.querySelector('aside');
    if (sidebar) {
        sidebar.classList.add('animate-slide-in-left', 'sidebar-slide');
    }
    
    // Animate menu items with stagger
    const menuItems = document.querySelectorAll('nav button');
    menuItems.forEach((item, index) => {
        item.classList.add('animate-stagger', `animate-stagger-${index + 1}`, 'sidebar-item');
    });
    
    // Animate quick actions
    const quickActions = document.querySelectorAll('.grid.grid-cols-2 button');
    quickActions.forEach((action, index) => {
        action.classList.add('animate-stagger', `animate-stagger-${index + 1}`, 'hover-lift', 'ripple-effect');
    });
}

// 3. Stats Cards Animations
function animateStatsCards() {
    const statsCards = document.querySelectorAll('.grid.grid-cols-1 > div');
    statsCards.forEach((card, index) => {
        card.classList.add('animate-stagger', `animate-stagger-${index + 1}`, 'stats-card');
        
        // Animate icons
        const icon = card.querySelector('.w-12.h-12');
        if (icon) {
            icon.classList.add('animate-bounce-in');
        }
        
        // Animate numbers
        const number = card.querySelector('.text-3xl');
        if (number) {
            number.classList.add('count-animate');
        }
    });
}

// 4. Welcome Section Animations
function animateWelcomeSection() {
    const welcomeSection = document.querySelector('.mb-8 > div');
    if (welcomeSection) {
        welcomeSection.classList.add('aurora-bg', 'hover-glow');
    }
    
    // Animate welcome text
    const welcomeTitle = document.querySelector('h2');
    if (welcomeTitle) {
        welcomeTitle.classList.add('animate-bounce-in');
    }
    
    // Animate award icon
    const awardIcon = document.querySelector('.w-16.h-16');
    if (awardIcon) {
        awardIcon.parentElement.classList.add('animate-rotate-in', 'morph-shape');
    }
}

// 5. Activity Cards Animations
function animateActivityCards() {
    const activityCards = document.querySelectorAll('.bg-white\\/10.backdrop-blur-xl');
    activityCards.forEach((card, index) => {
        card.classList.add('animate-stagger', `animate-stagger-${index + 1}`, 'hover-lift');
        
        // Animate card items
        const cardItems = card.querySelectorAll('.p-4');
        cardItems.forEach((item, itemIndex) => {
            item.classList.add('table-row', 'animate-stagger', `animate-stagger-${itemIndex + 1}`);
        });
    });
}

// 6. Footer Animation
function animateFooter() {
    const footer = document.querySelector('footer');
    if (footer) {
        footer.classList.add('animate-slide-in-bottom');
    }
}

// 7. Floating Particles
function createFloatingParticles() {
    const background = document.querySelector('.fixed.inset-0');
    if (background) {
        for (let i = 1; i <= 5; i++) {
            const particle = document.createElement('div');
            particle.className = `floating-particle particle-${i}`;
            background.appendChild(particle);
        }
    }
}

// 8. Interactive Hover Effects
function addInteractiveEffects() {
    // Add ripple effect to all buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.classList.add('ripple-effect');
    });
    
    // Add hover lift to cards
    const cards = document.querySelectorAll('.bg-white\\/10');
    cards.forEach(card => {
        card.classList.add('hover-lift');
    });
    
    // Add glow effect to important elements
    const importantElements = document.querySelectorAll('h1, h2, h3');
    importantElements.forEach(element => {
        element.classList.add('text-glow');
    });
}

// 9. Loading Animations
function addLoadingAnimations() {
    // Add shimmer effect to loading states
    const loadingElements = document.querySelectorAll('[data-loading]');
    loadingElements.forEach(element => {
        element.classList.add('loading-shimmer');
    });
}

// 10. Progress Animations
function animateProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar');
    progressBars.forEach(bar => {
        bar.classList.add('progress-animate');
    });
}

// Initialize all animations
function initializeAnimations() {
    animateSidebar();
    animateStatsCards();
    animateWelcomeSection();
    animateActivityCards();
    animateFooter();
    createFloatingParticles();
    addInteractiveEffects();
    addLoadingAnimations();
    animateProgressBars();
    
    console.log('✨ All dashboard animations initialized!');
}

// Run animations when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimations);
} else {
    initializeAnimations();
}

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Add parallax effect on scroll
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.parallax-slow, .parallax-fast');
    
    parallaxElements.forEach(element => {
        const speed = element.classList.contains('parallax-slow') ? 0.5 : 0.2;
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// Add intersection observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-scale');
        }
    });
}, observerOptions);

// Observe all major sections
document.querySelectorAll('section, main > div').forEach(section => {
    observer.observe(section);
});

console.log('🎨 Enhanced animation system loaded!');
