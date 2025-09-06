// Dashboard functionality for EcoLoop
class Dashboard {
    constructor() {
        this.userData = null;
        this.dashboardData = null;
        this.leaderboardData = null;
        this.charts = {}; // Store chart instances
        this.init();
    }

    async init() {
        try {
            // Check authentication first
            await this.checkAuthStatus();

            // Initialize event listeners
            this.initializeEventListeners();

            // Load dashboard data
            await this.loadDashboardData();

            // Load leaderboard data
            await this.loadLeaderboardData();

            // Update UI with real data
            this.updateDashboardUI();

            // Create charts
            this.createCharts();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.handleError('Failed to initialize dashboard');
        }
    }

    // Check authentication status
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Auth check failed');
            }

            const result = await response.json();

            if (!result.authenticated) {
                window.location.href = '/login';
                return;
            }

            this.userData = result.user;
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '/login';
        }
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation items
        document.querySelectorAll('.nav-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(e);
            });
        });
    }

    // Handle navigation
    handleNavigation(event) {
        // Remove active class from all items
        document
            .querySelectorAll('.nav-item')
            .forEach((nav) => nav.classList.remove('active'));

        // Add active class to clicked item
        event.target.closest('.nav-item').classList.add('active');

        // Get the target section
        const targetId = event.target
            .closest('.nav-item')
            .getAttribute('href')
            .substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight - 20;

            document.querySelector('.content-area').scrollTo({
                top: targetPosition,
                behavior: 'smooth',
            });
        }
    }

    // Load dashboard data from backend
    async loadDashboardData() {
        try {
            const response = await fetch('/api/user/dashboard', {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const result = await response.json();

            if (result.success) {
                this.dashboardData = result.data;
            } else {
                throw new Error(
                    result.message || 'Failed to load dashboard data'
                );
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            throw error;
        }
    }

    // Load leaderboard data
    async loadLeaderboardData() {
        try {
            const response = await fetch(
                '/api/user/leaderboard?metric=carbonSaved&period=30days',
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard data');
            }

            const result = await response.json();

            if (result.success) {
                this.leaderboardData = result.data;
            } else {
                throw new Error(
                    result.message || 'Failed to load leaderboard data'
                );
            }
        } catch (error) {
            console.error('Failed to load leaderboard data:', error);
            // Don't throw error for leaderboard, just log it
        }
    }

    // Create all charts
    createCharts() {
        if (!this.dashboardData) return;

        try {
            // Weekly trends chart
            this.createWeeklyTrendsChart();

            // Category distribution chart
            this.createCategoryChart();

            // Action types chart
            this.createActionChart();

            // Carbon impact chart
            this.createCarbonChart();
        } catch (error) {
            console.error('Failed to create charts:', error);
        }
    }

    // Create weekly trends chart
    createWeeklyTrendsChart() {
        const ctx = document.getElementById('weeklyTrendsChart');
        if (!ctx) return;

        const { trends } = this.dashboardData;

        if (!trends || trends.length === 0) {
            // Create sample data for demonstration
            const sampleData = this.createSampleTrendsData();
            this.createChartWithData(ctx, sampleData);
            return;
        }

        // Prepare data for the chart
        const labels = trends.map((item) => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        });

        const uploadsData = trends.map((item) => item.uploads || 0);
        const carbonData = trends.map((item) => item.carbonSaved || 0);

        this.createChartWithData(ctx, { labels, uploadsData, carbonData });
    }

    // Create sample data for trends chart
    createSampleTrendsData() {
        const labels = [];
        const uploadsData = [];
        const carbonData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            }));
            uploadsData.push(Math.floor(Math.random() * 5) + 1);
            carbonData.push(Math.floor(Math.random() * 3) + 0.5);
        }
        
        return { labels, uploadsData, carbonData };
    }

    // Create chart with data
    createChartWithData(ctx, { labels, uploadsData, carbonData }) {

        this.charts.weeklyTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Uploads',
                        data: uploadsData,
                        borderColor: '#4ade80',
                        backgroundColor: 'rgba(74, 222, 128, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y',
                    },
                    {
                        label: 'Carbon Saved (kg)',
                        data: carbonData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#fff',
                            font: {
                                size: 12,
                            },
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#4ade80',
                        borderWidth: 1,
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        },
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        },
                        title: {
                            display: true,
                            text: 'Uploads',
                            color: '#fff',
                        },
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        title: {
                            display: true,
                            text: 'Carbon Saved (kg)',
                            color: '#fff',
                        },
                    },
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
            },
        });
    }

    // Create category distribution chart
    createCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const { categories } = this.dashboardData;

        if (!categories || categories.length === 0) {
            this.showChartPlaceholder(
                'categoryChart',
                'No category data available'
            );
            return;
        }

        const labels = categories.map((item) => item.category);
        const data = categories.map((item) => item.count);
        const colors = [
            '#4ade80',
            '#f59e0b',
            '#3b82f6',
            '#ef4444',
            '#8b5cf6',
            '#06b6d4',
            '#84cc16',
            '#f97316',
        ];

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: colors.slice(0, labels.length),
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                            padding: 15,
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce(
                                    (a, b) => a + b,
                                    0
                                );
                                const percentage = (
                                    (context.parsed / total) *
                                    100
                                ).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    // Create action types chart
    createActionChart() {
        const ctx = document.getElementById('actionChart');
        if (!ctx) return;

        const { stats } = this.dashboardData;

        if (!stats) {
            this.showChartPlaceholder(
                'actionChart',
                'No action data available'
            );
            return;
        }

        const labels = ['Recycled', 'Reused', 'Donated'];
        const data = [
            stats.totalRecycled || 0,
            stats.totalReused || 0,
            stats.totalDonated || 0,
        ];

        // Only show chart if there's data
        if (data.every((val) => val === 0)) {
            this.showChartPlaceholder(
                'actionChart',
                'No actions completed yet'
            );
            return;
        }

        this.charts.action = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: [
                            'rgba(74, 222, 128, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                        ],
                        borderColor: ['#4ade80', '#3b82f6', '#f59e0b'],
                        borderWidth: 2,
                        borderRadius: 8,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function (context) {
                                return `${context.label}: ${context.parsed.y} items`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                        },
                        grid: {
                            display: false,
                        },
                    },
                    y: {
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        },
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    // Create carbon impact chart
    createCarbonChart() {
        const ctx = document.getElementById('carbonChart');
        if (!ctx) return;

        const { trends } = this.dashboardData;

        if (!trends || trends.length === 0) {
            this.showChartPlaceholder(
                'carbonChart',
                'No carbon data available'
            );
            return;
        }

        // Prepare data for carbon impact over time
        const labels = trends.map((item) => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        });

        const carbonData = trends.map((item) => item.carbonSaved || 0);

        this.charts.carbon = new Chart(ctx, {
            type: 'area',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Carbon Saved (kg)',
                        data: carbonData,
                        backgroundColor: 'rgba(34, 197, 94, 0.3)',
                        borderColor: '#22c55e',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#22c55e',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function (context) {
                                return `Carbon Saved: ${context.parsed.y.toFixed(
                                    2
                                )} kg`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        },
                    },
                    y: {
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 10,
                            },
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        },
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kg CO2',
                            color: '#fff',
                        },
                    },
                },
            },
        });
    }

    // Show chart placeholder when no data
    showChartPlaceholder(chartId, message) {
        const chartWrapper = document
            .getElementById(chartId)
            ?.closest('.chart-wrapper');
        if (chartWrapper) {
            chartWrapper.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255, 255, 255, 0.6); font-style: italic; text-align: center;">
          ${message}
        </div>
      `;
        }
    }

    // Update dashboard UI with real data
    updateDashboardUI() {
        if (!this.dashboardData) {
            this.handleError('No dashboard data available');
            return;
        }

        try {
            // Update user info
            this.updateUserInfo();

            // Update metrics
            this.updateMetrics();

            // Update badges
            this.updateBadges();

            // Update history
            this.updateHistory();

            // Update leaderboard
            this.updateLeaderboard();

            // Animate progress bars
            this.animateProgressBars();
        } catch (error) {
            console.error('Failed to update dashboard UI:', error);
            this.handleError('Failed to update dashboard display');
        }
    }

    // Update user information
    updateUserInfo() {
        const { user } = this.dashboardData;

        // Update user name
        const userNameElement = document.getElementById('userName');
        if (userNameElement && user.name) {
            userNameElement.textContent = user.name;
        }

        // Update user status based on achievements
        const userStatusElement = document.getElementById('userStatus');
        if (userStatusElement) {
            const status = this.getUserStatus(user);
            userStatusElement.textContent = status;
        }
    }

    // Get user status based on stats
    getUserStatus(user) {
        const stats = this.dashboardData.stats;

        if (stats.totalUploads >= 50) return 'Sustainability Champion';
        if (stats.totalUploads >= 25) return 'Eco Warrior';
        if (stats.totalUploads >= 10) return 'Green Guardian';
        if (stats.totalUploads >= 5) return 'Eco Explorer';
        if (stats.totalUploads >= 1) return 'Getting Started';

        return 'New User';
    }

    // Update metrics section
    updateMetrics() {
        const { stats } = this.dashboardData;

        // Total recycled this week
        const totalRecycledElement = document.getElementById('totalRecycled');
        if (totalRecycledElement) {
            const weeklyRecycled = this.getWeeklyStats('recycled');
            totalRecycledElement.textContent = `${weeklyRecycled} items`;
        }

        // Total carbon saved
        const totalCarbonSavedElement =
            document.getElementById('totalCarbonSaved');
        if (totalCarbonSavedElement) {
            const carbonSaved = stats.totalCarbonSaved || 0;
            totalCarbonSavedElement.textContent = `${carbonSaved.toFixed(
                1
            )} kg`;
        }

        // Weekly progress
        const weeklyProgressElement = document.getElementById('weeklyProgress');
        const progressFillElement = document.getElementById('progressFill');

        if (weeklyProgressElement && progressFillElement) {
            const weeklyGoal = 20; // Weekly goal of 20 uploads
            const weeklyUploads = this.getWeeklyStats('uploads');
            const progress = Math.min(weeklyUploads, weeklyGoal);
            const percentage = Math.min((progress / weeklyGoal) * 100, 100);

            weeklyProgressElement.textContent = `${progress}/${weeklyGoal}`;
            progressFillElement.style.width = `${percentage}%`;
        }
    }

    // Get weekly statistics
    getWeeklyStats(type) {
        if (!this.dashboardData.trends) return 0;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        let total = 0;

        this.dashboardData.trends.forEach((day) => {
            if (new Date(day.date) >= oneWeekAgo) {
                switch (type) {
                    case 'uploads':
                        total += day.uploads || 0;
                        break;
                    case 'recycled':
                        // Calculate from recent uploads data
                        total += this.dashboardData.recentUploads?.filter(upload => 
                            upload.userAction?.chosen === 'recycle' && 
                            new Date(upload.createdAt) >= oneWeekAgo
                        ).length || 0;
                        break;
                }
            }
        });

        return total;
    }

    // Update badges section
    updateBadges() {
        const badgesGrid = document.getElementById('badgesGrid');
        if (!badgesGrid) return;

        const { achievements } = this.dashboardData;

        if (!achievements || achievements.length === 0) {
            badgesGrid.innerHTML = `
        <div class="badge-card">
          <div class="badge-icon">🎯</div>
          <div class="badge-title">No Badges Yet</div>
          <div class="badge-description">Start uploading items to earn badges!</div>
        </div>
      `;
            return;
        }

        // Clear existing badges
        badgesGrid.innerHTML = '';

        // Add achievement badges
        achievements.forEach((achievement) => {
            const badgeCard = document.createElement('div');
            badgeCard.className = 'badge-card';
            badgeCard.innerHTML = `
        <div class="badge-icon">${achievement.icon}</div>
        <div class="badge-title">${achievement.title}</div>
        <div class="badge-description">${achievement.description}</div>
      `;
            badgesGrid.appendChild(badgeCard);
        });

        // Add placeholder for next badge
        const nextBadge = this.getNextBadge();
        if (nextBadge) {
            const nextBadgeCard = document.createElement('div');
            nextBadgeCard.className = 'badge-card next-badge';
            nextBadgeCard.innerHTML = `
        <div class="badge-icon">🔒</div>
        <div class="badge-title">${nextBadge.title}</div>
        <div class="badge-description">${nextBadge.description}</div>
      `;
            badgesGrid.appendChild(nextBadgeCard);
        }
    }

    // Get next badge to unlock
    getNextBadge() {
        const { stats } = this.dashboardData;

        if (stats.totalUploads < 5) {
            return {
                title: 'Green Guardian',
                description: 'Upload 5 items to unlock',
            };
        }

        if (stats.totalUploads < 25) {
            return {
                title: 'Eco Warrior',
                description: 'Upload 25 items to unlock',
            };
        }

        if (stats.totalUploads < 50) {
            return {
                title: 'Sustainability Champion',
                description: 'Upload 50 items to unlock',
            };
        }

        return null;
    }

    // Update history section
    updateHistory() {
        const historyContainer = document.getElementById('historyContainer');
        if (!historyContainer) return;

        const { recentUploads } = this.dashboardData;

        if (!recentUploads || recentUploads.length === 0) {
            historyContainer.innerHTML = `
        <div class="history-item">
          <div class="history-icon">📝</div>
          <div class="history-details">
            <div class="history-title">No Recent Activity</div>
            <div class="history-subtitle">Start by uploading your first item!</div>
          </div>
        </div>
      `;
            return;
        }

        // Clear existing history
        historyContainer.innerHTML = '';

        // Add recent uploads
        recentUploads.forEach((upload) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            const icon = this.getHistoryIcon(upload.aiAnalysis?.itemCategory);
            const title = this.getHistoryTitle(upload);
            const subtitle = this.getHistorySubtitle(upload);
            const imageUrl = (function () {
                if (upload.fileUrl) return upload.fileUrl;
                if (upload.filename) return `../uploads/${upload.filename}`;
                return '';
            })();

            historyItem.innerHTML = `
        <div class="history-thumb" style="width:56px; height:56px; border-radius:10px; overflow:hidden; background:#1f1f1f; flex:0 0 56px;">
          <img src="${imageUrl}" alt="Upload preview" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.style.display='none'">
        </div>
        <div class="history-details" style="margin-left:12px;">
          <div class="history-title">${title}</div>
          <div class="history-subtitle">${subtitle}</div>
        </div>
      `;

            historyContainer.appendChild(historyItem);
        });
    }

    // Get history icon based on category
    getHistoryIcon(category) {
        const iconMap = {
            plastic: '🗂️',
            metal: '🔩',
            paper: '📄',
            glass: '🔄',
            electronic: '💻',
            textile: '👕',
            organic: '🌱',
            other: '📦',
        };

        return iconMap[category] || '📝';
    }

    // Get history title
    getHistoryTitle(upload) {
        // Use itemName if available, otherwise fall back to description
        if (upload.aiAnalysis?.itemName) {
            return upload.aiAnalysis.itemName;
        }
        const description = (upload.aiAnalysis?.description || '')
            .split('\n')
            .filter(Boolean)[0];
        if (description && description.length > 0) {
            return description;
        }
        const category = upload.aiAnalysis?.itemCategory;
        return `Uploaded ${category || 'item'}`;
    }

    // Get history subtitle
    getHistorySubtitle(upload) {
        const timeAgo = this.getTimeAgo(upload.createdAt);
        const fileName = upload.originalName || upload.filename || 'Image';
        return `${timeAgo} • ${fileName}`;
    }

    // Get time ago string
    getTimeAgo(date) {
        const now = new Date();
        const uploadDate = new Date(date);
        const diffInMs = now - uploadDate;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24)
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        if (diffInDays < 7)
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

        return `${Math.floor(diffInDays / 7)} week${
            Math.floor(diffInDays / 7) > 1 ? 's' : ''
        } ago`;
    }

    // Update leaderboard
    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) return;

        // If no leaderboard data, show static data
        if (!this.leaderboardData || !this.leaderboardData.leaderboard || this.leaderboardData.leaderboard.length === 0) {
            leaderboardList.innerHTML = `
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#1</span>
          <span class="leaderboard-name">EcoChampion</span>
          <span class="leaderboard-score">2,450 pts</span>
        </div>
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#2</span>
          <span class="leaderboard-name">GreenWarrior</span>
          <span class="leaderboard-score">2,180 pts</span>
        </div>
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#3</span>
          <span class="leaderboard-name">PlantLover</span>
          <span class="leaderboard-score">1,950 pts</span>
        </div>
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#4</span>
          <span class="leaderboard-name">RecycleKing</span>
          <span class="leaderboard-score">1,780 pts</span>
        </div>
        <div class="leaderboard-item">
          <span class="leaderboard-rank">#5</span>
          <span class="leaderboard-name">EarthSaver</span>
          <span class="leaderboard-score">1,650 pts</span>
        </div>
      `;
            return;
        }

        const { leaderboard, userRank } = this.leaderboardData;

        // Clear existing leaderboard
        leaderboardList.innerHTML = '';

        // Add leaderboard items
        leaderboard.forEach((user, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';

            const rank = index + 1;
            const name = user.name || 'Anonymous';
            const score = `${
                user.recentStats?.carbonSaved?.toFixed(1) || user.stats?.carbonFootprintSaved?.toFixed(1) || 0
            } kg`;

            leaderboardItem.innerHTML = `
        <span class="leaderboard-rank">#${rank}</span>
        <span class="leaderboard-name">${name}</span>
        <span class="leaderboard-score">${score}</span>
      `;

            leaderboardList.appendChild(leaderboardItem);
        });

        // Add current user's rank if available
        if (userRank && userRank <= 10) {
            const userItem = document.createElement('div');
            userItem.className = 'leaderboard-item current-user';
            userItem.innerHTML = `
        <span class="leaderboard-rank">#${userRank}</span>
        <span class="leaderboard-name">You</span>
        <span class="leaderboard-score">${
            this.dashboardData.stats.totalCarbonSaved?.toFixed(1) || 0
        } kg</span>
      `;
            leaderboardList.appendChild(userItem);
        }
    }

    // Animate progress bars
    animateProgressBars() {
        const progressBars = document.querySelectorAll('.progress-fill');
        progressBars.forEach((bar) => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 500);
        });
    }

    // Handle logout
    async handleLogout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });

            const result = await response.json();

            if (result.success) {
                // Redirect to home page after logout
                window.location.href = '/';
            } else {
                console.error('Logout failed:', result.message);
                // Even if logout fails, redirect to home page
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Even if logout fails, redirect to home page
            window.location.href = '/';
        }
    }

    // Handle errors
    handleError(message) {
        console.error('Dashboard error:', message);

        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
      <div style="background: rgba(255, 0, 0, 0.1); border: 1px solid rgba(255, 0, 0, 0.3); 
                   padding: 20px; border-radius: 10px; margin: 20px; text-align: center; color: #fff;">
        <h3>⚠️ Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="background: #4ade80; border: none; padding: 10px 20px; 
                border-radius: 5px; color: #fff; cursor: pointer;">Retry</button>
      </div>
    `;

        // Insert error message at the top of the content area
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.insertBefore(errorDiv, contentArea.firstChild);
        }
    }

    // Cleanup charts on page unload
    cleanup() {
        Object.values(this.charts).forEach((chart) => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();

    // Cleanup charts when page unloads
    window.addEventListener('beforeunload', () => {
        dashboard.cleanup();
    });
});

// Export for potential external use
window.Dashboard = Dashboard;
