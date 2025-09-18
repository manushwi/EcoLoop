// Authentication functionality for index page
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.authenticated) {
            // User is logged in, show dashboard and logout
            document.getElementById('loginLink').style.display = 'none';
            document.getElementById('dashboardLink').style.display = 'inline-block';
            document.getElementById('logoutBtn').style.display = 'inline-block';
            document.getElementById('startScanningLink').href = '/upload?new=1';
            document.getElementById('viewDashboardLink').style.display = 'inline-block';
            document.getElementById('viewDashboardLink').href = '/dashboard';
            
            // Handle user avatar if it exists
            const avatar = document.getElementById('userAvatar');
            if (avatar) {
                if (result.user && result.user.avatar) {
                    avatar.src = result.user.avatar;
                } else {
                    avatar.src = '../images/person.png';
                }
                avatar.style.display = 'inline-block';
            }
        } else {
            // User is not logged in, show login
            document.getElementById('loginLink').style.display = 'inline-block';
            document.getElementById('dashboardLink').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'none';
            document.getElementById('startScanningLink').href = '/login';
            document.getElementById('viewDashboardLink').style.display = 'none';
            
            // Hide user avatar if it exists
            const avatar = document.getElementById('userAvatar');
            if (avatar) {
                avatar.style.display = 'none';
            }
        }
    } catch (error) {
        console.log('Auth check failed, showing login by default');
        // Default to showing login button on error
        document.getElementById('loginLink').style.display = 'inline-block';
        document.getElementById('dashboardLink').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('startScanningLink').href = '/login';
        document.getElementById('viewDashboardLink').style.display = 'none';
        
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.style.display = 'none';
        }
    }
}

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Redirect to home page after logout
            window.location.href = '/';
        } else {
            console.error('Logout failed:', result.message);
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Redirect to home page even if logout fails
        window.location.href = '/';
    }
}

// Initialize authentication functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to logout button if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Check auth status when page loads
    checkAuthStatus();
});

// Check authentication when page becomes visible (for back button navigation)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        checkAuthStatus();
    }
});

// Check authentication when page gains focus (for back button navigation)
window.addEventListener('focus', function() {
    checkAuthStatus();
});

// Check authentication when page is shown (for browser back/forward)
window.addEventListener('pageshow', function(event) {
    // Check if page is loaded from cache (back/forward navigation)
    if (event.persisted) {
        checkAuthStatus();
    }
});

// Export functions for use in other scripts if needed
window.authFunctions = {
    checkAuthStatus,
    handleLogout
};

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
  // Create menu toggle button
  const menuToggle = document.createElement('div');
  menuToggle.className = 'menu-toggle';
  menuToggle.innerHTML = '<span></span><span></span><span></span>';
  
  // Insert toggle button into nav
  const nav = document.querySelector('nav');
  nav.appendChild(menuToggle);
  
  // Get nav links
  const navLinks = document.querySelector('.nav-links');
  
  // Toggle menu on click
  menuToggle.addEventListener('click', function() {
    this.classList.toggle('open');
    navLinks.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
  });
  
  // Close menu when clicking on a link
  const navItems = navLinks.querySelectorAll('a, .logout-btn');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!nav.contains(event.target) && navLinks.classList.contains('active')) {
      menuToggle.classList.remove('open');
      navLinks.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});