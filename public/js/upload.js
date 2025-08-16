// upload.js - External JavaScript file for EcoLoop upload functionality
// This file should be saved as public/js/upload.js in your project

// Global variables
let selectedFile = null;
let uploadId = null;
let selectedAction = null;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing upload page...');
  createBackgroundParticles();
  checkAuthStatus();
  setupEventListeners();
});

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
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
    particlesContainer.appendChild(particle);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
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
    chooseImageBtn.addEventListener('click', function() {
      document.getElementById('fileInput').click();
    });
  }

  // Camera button
  const cameraBtn = document.getElementById('cameraBtn');
  if (cameraBtn) {
    cameraBtn.addEventListener('click', openCamera);
  }

  // Final upload button
  const finalUploadBtn = document.getElementById('finalUploadBtn');
  if (finalUploadBtn) {
    finalUploadBtn.addEventListener('click', uploadImage);
  }

  // Camera box click
  const cameraBox = document.getElementById('cameraBox');
  if (cameraBox) {
    cameraBox.addEventListener('click', function() {
      document.getElementById('fileInput').click();
    });
  }

  // Action options
  const actionOptions = document.querySelectorAll('.action-option');
  actionOptions.forEach(option => {
    option.addEventListener('click', function() {
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

  cameraBox.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = '#1fd461';
    this.style.background = 'rgba(31, 212, 97, 0.1)';
  });

  cameraBox.addEventListener('dragleave', function(e) {
    e.preventDefault();
    this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    this.style.background = 'rgba(255, 255, 255, 0.02)';
  });

  cameraBox.addEventListener('drop', function(e) {
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
    if (document.getElementById('uploadOverlay').style.display === 'flex') {
      // Don't allow closing during upload
      return;
    }
  }
  
  if (e.key === 'Enter' && selectedFile && document.getElementById('uploadOverlay').style.display !== 'flex') {
    uploadImage();
  }
}

// Authentication check
async function checkAuthStatus() {
  try {
    console.log('Checking authentication status...');
    const response = await fetch('/api/auth/status', {
      credentials: 'include'
    });
    
    console.log('Auth check response:', response.status);
    
    if (!response.ok) {
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
    // For debugging, let's not redirect immediately
    showError('Authentication check failed. Some features may not work.');
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
    lastModified: file.lastModified
  });

  // Validate file
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
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  console.log('Validating file:', {
    type: file.type,
    size: file.size,
    maxSize: maxSize,
    allowedTypes: allowedTypes
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
  reader.onload = function(e) {
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
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Here you would implement camera capture functionality
    // For now, we'll just trigger the file input
    document.getElementById('fileInput').click();
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
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
    // Create FormData
    const formData = new FormData();
    formData.append('image', selectedFile);

    console.log('FormData created, making request to /api/upload/image');

    // Simulate progress
    simulateProgress();

    // Make the upload request
    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      // Don't set Content-Type header, let browser set it with boundary
    });

    console.log('Response received:', response.status, response.statusText);

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response not ok:', errorText);
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    // Parse JSON response
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
    
    // Wait for AI analysis
    await waitForAnalysis(uploadId);

  } catch (error) {
    console.error('Upload error:', error);
    hideUploadOverlay();
    
    // Show more specific error messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showError('Network error. Please check your connection and try again.');
    } else if (error.message.includes('413')) {
      showError('File too large. Please choose a smaller image (max 10MB).');
    } else if (error.message.includes('401')) {
      showError('Please log in again to upload images.');
      setTimeout(function() {
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
    { progress: 80, text: 'Generating recommendations...' },
    { progress: 100, text: 'Analysis complete!' }
  ];

  let currentStep = 0;
  
  const updateProgress = function() {
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

// Wait for AI analysis to complete
async function waitForAnalysis(uploadId) {
  const maxAttempts = 30; // 30 seconds max wait
  let attempts = 0;
  
  console.log('Starting to wait for analysis, uploadId:', uploadId);

  const checkAnalysis = async function() {
    try {
      console.log(`Checking analysis status, attempt ${attempts + 1}/${maxAttempts}`);
      
      const response = await fetch(`/api/upload/${uploadId}/result`, {
        credentials: 'include'
      });

      console.log('Analysis check response:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to check analysis status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Analysis result:', result);

      if (!result.success) {
        throw new Error('Failed to get analysis result: ' + result.message);
      }

      const analysis = result.data.analysis;
      console.log('Analysis status:', analysis.status);
      
      if (analysis.status === 'completed') {
        console.log('Analysis completed successfully');
        hideUploadOverlay();
        showResults(result.data);
        showSuccessMessage();
      } else if (analysis.status === 'failed') {
        console.error('Analysis failed:', analysis.error);
        throw new Error(analysis.error || 'AI analysis failed');
      } else if (analysis.status === 'processing' || analysis.status === 'pending') {
        if (attempts < maxAttempts) {
          attempts++;
          console.log('Analysis still processing, checking again in 1 second...');
          setTimeout(checkAnalysis, 1000);
        } else {
          throw new Error('Analysis timeout. Please try again.');
        }
      } else {
        console.warn('Unknown analysis status:', analysis.status);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkAnalysis, 1000);
        } else {
          throw new Error('Analysis timeout. Please try again.');
        }
      }
    } catch (error) {
      console.error('Analysis check error:', error);
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
  
  // Hide scanner card and show results
  if (scannerCard) {
    scannerCard.style.display = 'none';
  }
  if (resultsContainer) {
    resultsContainer.style.display = 'grid';
  }
  
  // Set uploaded image
  if (uploadedImage) {
    uploadedImage.src = data.fileUrl;
  }
  
  // Populate results with AI analysis
  if (data.analysis && data.analysis.status === 'completed') {
    populateAnalysisResults(data.analysis);
  } else {
    // Show default/placeholder data
    showDefaultResults();
  }
}

// Populate results with AI analysis data
function populateAnalysisResults(analysis) {
  const itemTitle = document.getElementById('itemTitle');
  const decomposeTime = document.getElementById('decomposeTime');
  const material = document.getElementById('material');
  const condition = document.getElementById('condition');

  // Set item category as title
  if (analysis.itemCategory && itemTitle) {
    itemTitle.textContent = capitalizeFirst(analysis.itemCategory);
  }

  // Set material info
  if (analysis.itemCategory && material) {
    material.textContent = capitalizeFirst(analysis.itemCategory);
  }

  // Set decompose time based on category
  const decomposeTimes = {
    plastic: '450 years',
    metal: '50-100 years',
    paper: '2-6 weeks',
    glass: '1 million years',
    electronic: '1000+ years',
    textile: '200+ years',
    organic: '2-8 weeks',
    other: 'Variable'
  };

  if (analysis.itemCategory && decomposeTimes[analysis.itemCategory] && decomposeTime) {
    decomposeTime.textContent = decomposeTimes[analysis.itemCategory];
  }

  // Set condition based on confidence
  if (analysis.confidence && condition) {
    if (analysis.confidence > 0.8) {
      condition.textContent = 'Excellent';
    } else if (analysis.confidence > 0.6) {
      condition.textContent = 'Good';
    } else {
      condition.textContent = 'Fair';
    }
  }

  // Update action bars based on recommendations
  updateActionBars(analysis.recommendations);
}

// Show default results (fallback)
function showDefaultResults() {
  // Keep the default values from HTML
  console.log('Using default results');
}

// Update action option bars based on AI recommendations
function updateActionBars(recommendations) {
  if (!recommendations) return;

  const actionOptions = document.querySelectorAll('.action-option');
  
  actionOptions.forEach(function(option) {
    const action = option.getAttribute('data-action');
    const bars = option.querySelectorAll('.action-bar');
    
    let fillCount = 3; // default
    
    if (recommendations[action] && recommendations[action].possible) {
      // If action is possible, show more bars filled
      fillCount = 4;
    }
    
    // Clear all filled classes
    bars.forEach(function(bar) {
      bar.classList.remove('filled');
    });
    
    // Fill appropriate number of bars
    for (let i = 0; i < fillCount && i < bars.length; i++) {
      bars[i].classList.add('filled');
    }
  });
}

// Select action option
function selectAction(element, action) {
  // Remove previous selection
  document.querySelectorAll('.action-option').forEach(function(option) {
    option.classList.remove('selected');
  });
  
  // Select current option
  element.classList.add('selected');
  selectedAction = action;

  // Send action to backend
  if (uploadId) {
    submitAction(action);
  }
}

// Submit selected action to backend
async function submitAction(action) {
  try {
    const response = await fetch(`/api/upload/${uploadId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: action }),
      credentials: 'include'
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Action recorded successfully:', result.data);
      showActionFeedback(action);
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
    recycle: '♻️ Great choice! You\'re helping reduce waste.',
    reuse: '🔄 Excellent! Reusing helps extend product life.',
    donate: '❤️ Wonderful! You\'re helping others and the planet.'
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
    setTimeout(function() {
      successMessage.classList.remove('show');
    }, 3000);
  }
}

// Show error message
function showError(message) {
  // Remove any existing error messages
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
  setTimeout(function() {
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

  setTimeout(function() {
    successDiv.style.animation = 'slideOutRight 0.5s ease';
    setTimeout(function() {
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

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    checkAuthStatus();
  }
});

// Handle page focus
window.addEventListener('focus', function() {
  checkAuthStatus();
});

// Handle browser back/forward
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    checkAuthStatus();
  }
});