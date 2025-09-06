// upload.js - External JavaScript file for EcoLoop upload functionality
// This file should be saved as public/js/upload.js in your project

// Global variables
let selectedFile = null;
let uploadId = null;
let selectedAction = null;
let authCheckInProgress = false;
let analysisCheckInProgress = false;
let lastAuthCheck = 0;
const AUTH_CHECK_COOLDOWN = 30000; // 30 seconds between auth checks

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing upload page...');
    createBackgroundParticles();
    checkAuthStatus();
    setupEventListeners();
    handleInitialRestoreOrReset();
});

function handleInitialRestoreOrReset() {
    const params = new URLSearchParams(window.location.search);
    const isNew = params.get('new') === '1';
    if (isNew) {
        clearUploadSessionPersistence();
        resetUploadForm();
        return;
    }
    let shouldRestore = false;
    try {
        shouldRestore = sessionStorage.getItem('returnToUploadWithRestore') === '1';
    } catch (_) {}
    if (shouldRestore) {
        restoreFromSession();
    }
}

function clearUploadSessionPersistence() {
    try {
        sessionStorage.removeItem('lastUploadId');
        sessionStorage.removeItem('lastItemCategory');
        sessionStorage.removeItem('lastItemDescription');
        sessionStorage.removeItem('lastPreviewDataUrl');
        sessionStorage.removeItem('returnToUploadWithRestore');
    } catch (_) {}
}

function resetUploadForm() {
    const scannerCard = document.getElementById('scannerCard');
    const resultsContainer = document.getElementById('resultsContainer');
    const imagePreview = document.getElementById('imagePreview');
    const cameraIcon = document.getElementById('cameraIcon');
    const cameraText = document.getElementById('cameraText');
    const finalUploadBtn = document.getElementById('finalUploadBtn');
    selectedFile = null;
    uploadId = null;
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (scannerCard) scannerCard.style.display = 'block';
    if (imagePreview) {
        imagePreview.src = '';
        imagePreview.style.display = 'none';
    }
    if (cameraIcon) cameraIcon.style.display = 'block';
    if (cameraText) {
        cameraText.style.display = 'block';
        cameraText.textContent = 'Camera preview will appear here';
        cameraText.style.color = '';
    }
    if (finalUploadBtn) finalUploadBtn.style.display = 'none';
}

// Restore last analysis so user doesn't need to re-upload on return
async function restoreFromSession() {
    let lastId = null;
    try {
        lastId = sessionStorage.getItem('lastUploadId');
    } catch (_) {}
    if (!lastId) return;

    try {
        const res = await fetchWithRetry(
            `/api/upload/${encodeURIComponent(lastId)}/result`,
            { credentials: 'include' },
            1 // Only 1 retry for restore
        );
        if (!res.ok) return;
        const payload = await res.json();
        if (!payload.success) return;
        const data = payload.data;
        if (data && data.analysis) {
            uploadId = data.uploadId;
            showResults(data);
        }
    } catch (e) {
        console.log('Could not restore session, starting fresh');
    }
}

// Fetch with retry and exponential backoff
async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            // If we get a rate limit error, wait and retry
            if (response.status === 429) {
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                    console.log(`Rate limited, retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
            
            return response;
        } catch (error) {
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                console.log(`Request failed, retrying in ${delay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

// Create floating background particles
function createBackgroundParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = Math.random() * 6 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = Math.random() * 4 + 4 + 's';
        particlesContainer.appendChild(particle);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/';
        });
    }

    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Choose image button
    const chooseImageBtn = document.getElementById('chooseImageBtn');
    if (chooseImageBtn) {
        chooseImageBtn.addEventListener('click', function () {
            clearUploadSessionPersistence();
            resetUploadForm();
            document.getElementById('fileInput').click();
        });
    }

    // Camera button
    const cameraBtn = document.getElementById('cameraBtn');
    if (cameraBtn) {
        cameraBtn.addEventListener('click', function () {
            clearUploadSessionPersistence();
            resetUploadForm();
            openCamera();
        });
    }

    // Final upload button
    const finalUploadBtn = document.getElementById('finalUploadBtn');
    if (finalUploadBtn) {
        finalUploadBtn.addEventListener('click', uploadImage);
    }

    // Camera box click
    const cameraBox = document.getElementById('cameraBox');
    if (cameraBox) {
        cameraBox.addEventListener('click', function () {
            document.getElementById('fileInput').click();
        });
    }

    // Action options
    const actionOptions = document.querySelectorAll('.action-option');
    actionOptions.forEach((option) => {
        option.addEventListener('click', function () {
            const action = this.getAttribute('data-action');
            selectAction(this, action);
        });
    });

    // Drag and drop functionality
    setupDragAndDrop();

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Setup drag and drop
function setupDragAndDrop() {
    const cameraBox = document.getElementById('cameraBox');
    if (!cameraBox) return;

    cameraBox.addEventListener('dragover', function (e) {
        e.preventDefault();
        this.style.borderColor = '#1fd461';
        this.style.background = 'rgba(31, 212, 97, 0.1)';
    });

    cameraBox.addEventListener('dragleave', function (e) {
        e.preventDefault();
        this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        this.style.background = 'rgba(255, 255, 255, 0.02)';
    });

    cameraBox.addEventListener('drop', function (e) {
        e.preventDefault();
        this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        this.style.background = 'rgba(255, 255, 255, 0.02)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (validateFile(file)) {
                selectedFile = file;
                showImagePreview(file);
            }
        }
    });
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (e.key === 'Escape') {
        const overlay = document.getElementById('uploadOverlay');
        if (overlay && overlay.style.display === 'flex') {
            return;
        }
    }

    if (
        e.key === 'Enter' &&
        selectedFile &&
        (function(){ const ov = document.getElementById('uploadOverlay'); return !ov || ov.style.display !== 'flex'; })()
    ) {
        uploadImage();
    }
}

// Authentication check with rate limiting prevention
async function checkAuthStatus() {
    // Prevent multiple concurrent auth checks
    if (authCheckInProgress) {
        console.log('Auth check already in progress, skipping');
        return;
    }
    
    // Rate limit auth checks
    const now = Date.now();
    if (now - lastAuthCheck < AUTH_CHECK_COOLDOWN) {
        console.log('Auth check on cooldown, skipping');
        return;
    }
    
    authCheckInProgress = true;
    lastAuthCheck = now;
    
    try {
        console.log('Checking authentication status...');
        const response = await fetchWithRetry('/api/auth/status', {
            credentials: 'include',
        }, 2); // Max 2 retries for auth check

        console.log('Auth check response:', response.status);

        if (!response.ok) {
            if (response.status === 429) {
                console.log('Auth check rate limited, user likely still authenticated');
                return; // Don't redirect on rate limit
            }
            console.log('Auth check failed with status:', response.status);
            window.location.href = '/login';
            return;
        }

        const result = await response.json();
        console.log('Auth result:', result);

        if (!result.authenticated) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/login';
            return;
        }

        console.log('User authenticated successfully');
    } catch (error) {
        console.error('Auth check error:', error);
        // Don't redirect on network errors, just show warning
        if (error.message.includes('429')) {
            console.log('Rate limited during auth check, assuming user is authenticated');
        } else {
            showError('Connection issue. Some features may not work.');
        }
    } finally {
        authCheckInProgress = false;
    }
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    console.log('File selected:', file);

    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
    });

    if (!validateFile(file)) {
        console.log('File validation failed');
        return;
    }

    selectedFile = file;
    console.log('File validation passed, showing preview');
    showImagePreview(file);
}

// Validate selected file
function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    console.log('Validating file:', {
        type: file.type,
        size: file.size,
        maxSize: maxSize,
        allowedTypes: allowedTypes,
    });

    if (!allowedTypes.includes(file.type)) {
        console.error('Invalid file type:', file.type);
        showError('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
        return false;
    }

    if (file.size > maxSize) {
        console.error('File too large:', file.size, 'bytes');
        showError('File size must be less than 10MB');
        return false;
    }

    console.log('File validation successful');
    return true;
}

// Show image preview
function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const imagePreview = document.getElementById('imagePreview');
        const cameraIcon = document.getElementById('cameraIcon');
        const cameraText = document.getElementById('cameraText');
        const cameraBox = document.getElementById('cameraBox');
        const finalUploadBtn = document.getElementById('finalUploadBtn');

        if (imagePreview) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        }

        if (cameraIcon) {
            cameraIcon.style.display = 'none';
        }

        if (cameraText) {
            cameraText.style.display = 'none';
        }

        if (cameraBox) {
            cameraBox.classList.add('has-image');
        }

        if (finalUploadBtn) {
            finalUploadBtn.style.display = 'block';
        }

        // Persist preview data URL for later fallback on results image
        try {
            if (typeof sessionStorage !== 'undefined' && e.target && e.target.result) {
                sessionStorage.setItem('lastPreviewDataUrl', String(e.target.result));
            }
        } catch (err) {
            // ignore storage errors
        }

        // Add confirmation text
        if (cameraText) {
            cameraText.textContent = 'Image selected! Click "Analyze & Upload" to continue';
            cameraText.style.display = 'block';
            cameraText.style.color = '#1fd461';
            cameraText.style.marginTop = '16px';
        }
    };
    reader.readAsDataURL(file);
}

// Open camera (if supported)
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
        });
        document.getElementById('fileInput').click();
        stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
        console.log('Camera not available, using file input');
        document.getElementById('fileInput').click();
    }
}

// Upload image to backend
async function uploadImage() {
    if (!selectedFile) {
        showError('Please select an image first');
        return;
    }

    console.log('Starting upload for file:', selectedFile.name, 'Size:', selectedFile.size);
    showUploadOverlay();

    try {
        const formData = new FormData();
        formData.append('image', selectedFile);

        console.log('FormData created, making request to /api/upload/image');
        simulateProgress();

        const response = await fetchWithRetry('/api/upload/image', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        }, 3); // Allow 3 retries for upload

        console.log('Response received:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response not ok:', errorText);
            
            if (response.status === 429) {
                throw new Error('Server is busy. Please wait a moment and try again.');
            }
            
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        let result;
        try {
            result = await response.json();
            console.log('Parsed response:', result);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            throw new Error('Invalid server response');
        }

        if (!result.success) {
            console.error('Upload failed with error:', result.message);
            throw new Error(result.message || 'Upload failed');
        }

        uploadId = result.data.uploadId;
        console.log('Upload successful, uploadId:', uploadId);

        await waitForAnalysis(uploadId);
    } catch (error) {
        console.error('Upload error:', error);
        hideUploadOverlay();

        if (error.message.includes('Server is busy')) {
            showError('Server is busy. Please wait a moment and try again.');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Network error. Please check your connection and try again.');
        } else if (error.message.includes('413')) {
            showError('File too large. Please choose a smaller image (max 10MB).');
        } else if (error.message.includes('401')) {
            showError('Please log in again to upload images.');
            setTimeout(function () {
                window.location.href = '/login';
            }, 2000);
        } else if (error.message.includes('400')) {
            showError('Invalid file format. Please select a valid image file.');
        } else {
            showError(error.message || 'Upload failed. Please try again.');
        }
    }
}

// Show upload overlay with animation
function showUploadOverlay() {
    const overlay = document.getElementById('uploadOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Hide upload overlay
function hideUploadOverlay() {
    const overlay = document.getElementById('uploadOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Simulate progress animation
function simulateProgress() {
    const progressBar = document.getElementById('progressBar');
    const uploadText = document.getElementById('uploadText');

    const steps = [
        { progress: 20, text: 'Uploading image...' },
        { progress: 40, text: 'Processing image...' },
        { progress: 60, text: 'Analyzing with AI...' },
        { progress: 80, text: 'Generating sustainability recommendations...' },
        { progress: 100, text: 'Analysis complete!' },
    ];

    let currentStep = 0;

    const updateProgress = function () {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            if (progressBar) {
                progressBar.style.width = step.progress + '%';
            }
            if (uploadText) {
                uploadText.textContent = step.text;
            }
            currentStep++;
            setTimeout(updateProgress, 1000);
        }
    };

    updateProgress();
}

// Wait for AI analysis to complete with improved rate limiting
async function waitForAnalysis(uploadId) {
    if (analysisCheckInProgress) {
        console.log('Analysis check already in progress');
        return;
    }
    
    analysisCheckInProgress = true;
    const maxAttempts = 20; // Reduced from 30
    let attempts = 0;
    let consecutiveFailures = 0;

    console.log('Starting to wait for analysis, uploadId:', uploadId);

    const checkAnalysis = async function () {
        try {
            console.log(`Checking analysis status, attempt ${attempts + 1}/${maxAttempts}`);

            const response = await fetchWithRetry(`/api/upload/${uploadId}/result`, {
                credentials: 'include',
            }, 2); // Max 2 retries per check

            console.log('Analysis check response:', response.status);

            if (!response.ok) {
                if (response.status === 429) {
                    consecutiveFailures++;
                    if (consecutiveFailures >= 3) {
                        throw new Error('Server is overloaded. Please try again in a few minutes.');
                    }
                    // Longer delay for rate limiting
                    const delay = Math.min(15000, 5000 * consecutiveFailures);
                    console.log(`Rate limited, waiting ${delay / 1000}s before retry...`);
                    setTimeout(checkAnalysis, delay);
                    return;
                }
                throw new Error(`Failed to check analysis status: ${response.status}`);
            }

            consecutiveFailures = 0; // Reset on successful response
            const result = await response.json();
            console.log('Analysis result:', result);

            if (!result.success) {
                throw new Error('Failed to get analysis result: ' + result.message);
            }

            const analysis = result.data.analysis;
            console.log('Analysis status:', analysis.status);

            if (analysis.status === 'completed') {
                console.log('Analysis completed successfully');
                analysisCheckInProgress = false;
                hideUploadOverlay();
                showResults(result.data);
                showSuccessMessage();
            } else if (analysis.status === 'failed') {
                console.error('Analysis failed:', analysis.error);
                analysisCheckInProgress = false;
                throw new Error(analysis.error || 'AI analysis failed');
            } else if (analysis.status === 'processing' || analysis.status === 'pending') {
                if (attempts < maxAttempts) {
                    attempts++;
                    // Progressive delay: start with 3s, increase to max 8s
                    const baseDelay = 3000;
                    const maxDelay = 8000;
                    const delay = Math.min(maxDelay, baseDelay + (attempts * 500));
                    console.log(`Analysis still processing, checking again in ${delay / 1000}s...`);
                    setTimeout(checkAnalysis, delay);
                } else {
                    analysisCheckInProgress = false;
                    throw new Error('Analysis is taking longer than expected. Please check back in a few minutes.');
                }
            } else {
                console.warn('Unknown analysis status:', analysis.status);
                if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkAnalysis, 8000); // 8s delay for unknown status
                } else {
                    analysisCheckInProgress = false;
                    throw new Error('Analysis timeout. Please try again.');
                }
            }
        } catch (error) {
            console.error('Analysis check error:', error);
            analysisCheckInProgress = false;
            hideUploadOverlay();
            showError(error.message);
        }
    };

    checkAnalysis();
}

// Show results after successful analysis
function showResults(data) {
    const scannerCard = document.getElementById('scannerCard');
    const resultsContainer = document.getElementById('resultsContainer');
    const uploadedImage = document.getElementById('uploadedImage');

    if (scannerCard) {
        scannerCard.style.display = 'none';
    }
    if (resultsContainer) {
        resultsContainer.style.display = 'grid';
    }

    if (uploadedImage) {
        const previewUrl = (function () {
            try {
                return sessionStorage.getItem('lastPreviewDataUrl');
            } catch (_) {
                return null;
            }
        })() || '';
        if (previewUrl) {
            uploadedImage.src = previewUrl;
        }
        if (data && data.fileUrl) {
            const serverUrl = data.fileUrl;
            const tempImg = new Image();
            tempImg.onload = function () {
                uploadedImage.src = serverUrl;
            };
            tempImg.onerror = function () {
                // fallback remains preview
            };
            tempImg.src = serverUrl;
        }
    }

    try {
        if (typeof sessionStorage !== 'undefined') {
            if (data && data.uploadId) {
                sessionStorage.setItem('lastUploadId', String(data.uploadId));
            }
            if (data && data.analysis) {
                if (data.analysis.itemCategory) {
                    sessionStorage.setItem('lastItemCategory', String(data.analysis.itemCategory));
                }
                if (data.analysis.description) {
                    sessionStorage.setItem('lastItemDescription', String(data.analysis.description));
                }
            }
        }
    } catch (e) {
        // ignore storage errors
    }

    if (data.analysis && data.analysis.status === 'completed') {
        populateAnalysisResults(data.analysis);
    } else {
        showDefaultResults();
    }

    try {
        const controlsHost = document.getElementById('resultsControls');
        if (controlsHost && controlsHost.childElementCount === 0) {
            controlsHost.innerHTML = `
        <div class="button-group" style="gap:10px;">
          <a href="/upload?new=1" id="uploadAnotherBtn">⛶ Scan Another Item</a>
          <a href="/dashboard" id="goDashboardBtn">📊 Go to Dashboard</a>
        </div>
      `;
            const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
            const goDashboardBtn = document.getElementById('goDashboardBtn');
            if (uploadAnotherBtn) {
                uploadAnotherBtn.addEventListener('click', function (e) {
                    // let navigation proceed
                });
            }
            if (goDashboardBtn) {
                goDashboardBtn.addEventListener('click', function (e) {
                    window.location.href = '/dashboard';
                });
            }
        }
    } catch (_) {}
}

// Populate results with AI analysis data
function populateAnalysisResults(analysis) {
    const itemTitle = document.getElementById('itemTitle');
    const decomposeTime = document.getElementById('decomposeTime');
    const material = document.getElementById('material');
    const condition = document.getElementById('condition');

    if (itemTitle) {
        // Show item name instead of description
        if (analysis.itemName) {
            itemTitle.textContent = analysis.itemName;
        } else if (analysis.itemCategory) {
            itemTitle.textContent = capitalizeFirst(analysis.itemCategory);
        }
    }

    if (material) {
        if (analysis.itemCategory) {
            material.textContent = capitalizeFirst(analysis.itemCategory);
        } else {
            material.textContent = '-';
        }
    }

    if (decomposeTime) {
        const env = analysis.environmental || {};
        const footprint = typeof env.carbonFootprint === 'number' ? env.carbonFootprint : null;
        decomposeTime.textContent = footprint != null ? `${footprint.toFixed(2)} kg CO2` : '-';
    }

    if (analysis.confidence && condition) {
        condition.textContent = `${Math.round(analysis.confidence * 100)}%`;
    }

    updateActionBars(analysis.recommendations);

    try {
        if (typeof sessionStorage !== 'undefined') {
            if (uploadId) {
                sessionStorage.setItem('lastUploadId', String(uploadId));
            }
            if (analysis.itemCategory) {
                sessionStorage.setItem('lastItemCategory', String(analysis.itemCategory));
            }
            if (analysis.description) {
                sessionStorage.setItem('lastItemDescription', String(analysis.description));
            }
        }
    } catch (e) {
        // ignore storage errors
    }
}

// Show default results (fallback)
function showDefaultResults() {
    console.log('Using default results');
}

// Update action option bars based on AI recommendations
function updateActionBars(recommendations) {
    if (!recommendations) return;

    const actionOptions = document.querySelectorAll('.action-option');

    actionOptions.forEach(function (option) {
        const action = option.getAttribute('data-action');
        const bars = option.querySelectorAll('.action-bar');

        let fillCount = 3; // default

        if (recommendations[action] && recommendations[action].possible) {
            fillCount = 4;
        }

        bars.forEach(function (bar) {
            bar.classList.remove('filled');
        });

        for (let i = 0; i < fillCount && i < bars.length; i++) {
            bars[i].classList.add('filled');
        }
    });
}

// Select action option
function selectAction(element, action) {
    document.querySelectorAll('.action-option').forEach(function (option) {
        option.classList.remove('selected');
    });

    element.classList.add('selected');
    selectedAction = action;

    if (uploadId) {
        submitAction(action);
    }
}

// Submit selected action to backend
async function submitAction(action) {
    try {
        const response = await fetchWithRetry(`/api/upload/${uploadId}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: action }),
            credentials: 'include',
        }, 2);

        const result = await response.json();

        if (result.success) {
            console.log('Action recorded successfully:', result.data);
            showActionFeedback(action);
            const redirectUrl = `/${action}?uploadId=${encodeURIComponent(uploadId)}`;
            setTimeout(function () {
                window.location.href = redirectUrl;
            }, 600);
        } else {
            showError('Failed to record your action. Please try again.');
        }
    } catch (error) {
        console.error('Action submission error:', error);
        showError('Failed to record your action. Please try again.');
    }
}

// Show feedback after action selection
function showActionFeedback(action) {
    const feedbackMessages = {
        recycle: "♻️ Great choice! You're helping reduce waste.",
        reuse: '🔄 Excellent! Reusing helps extend product life.',
        donate: "❤️ Wonderful! You're helping others and the planet.",
    };

    if (feedbackMessages[action]) {
        showSuccess(feedbackMessages[action]);
    }
}

// Show success message
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.classList.add('show');
        setTimeout(function () {
            successMessage.classList.remove('show');
        }, 3000);
    }
}

// Show error message
function showError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    const scannerCard = document.getElementById('scannerCard');
    const finalUploadBtn = document.getElementById('finalUploadBtn');

    if (scannerCard) {
        if (finalUploadBtn && finalUploadBtn.style.display === 'block') {
            scannerCard.insertBefore(errorDiv, finalUploadBtn);
        } else {
            scannerCard.appendChild(errorDiv);
        }
    }

    // Auto remove after 5 seconds
    setTimeout(function () {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Show success message (general)
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #1fd461, #1ab653);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 10px 30px rgba(31, 212, 97, 0.4);
    z-index: 10001;
    animation: slideInRight 0.5s ease;
  `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    setTimeout(function () {
        successDiv.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(function () {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 500);
    }, 3000);
}

// Utility function to capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Handle page visibility changes (with rate limiting)
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        // Only check auth if page was hidden for more than 5 minutes
        const timeSinceLastCheck = Date.now() - lastAuthCheck;
        if (timeSinceLastCheck > 300000) { // 5 minutes
            checkAuthStatus();
        }
    }
});

// Handle page focus (with rate limiting)
window.addEventListener('focus', function () {
    // Only check auth if it's been more than 1 minute since last check
    const timeSinceLastCheck = Date.now() - lastAuthCheck;
    if (timeSinceLastCheck > 60000) { // 1 minute
        checkAuthStatus();
    }
});

// Handle browser back/forward (with rate limiting)
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        // Only check auth if it's been more than 30 seconds since last check
        const timeSinceLastCheck = Date.now() - lastAuthCheck;
        if (timeSinceLastCheck > 30000) { // 30 seconds
            checkAuthStatus();
        }
    }
});