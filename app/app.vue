<template>
  <div class="app">
    <div class="container">
      <header class="header">
        <div class="logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="logo-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
          <h1>Silas</h1>
        </div>
        <p class="tagline">Convert YouTube & TikTok to MP3/MP4</p>
      </header>

      <div class="input-section">
        <div class="input-wrapper">
          <input
            v-model="url"
            type="text"
            placeholder="Paste YouTube or TikTok URL here..."
            class="url-input"
            @keyup.enter="fetchInfo"
          />
          <button 
            class="fetch-btn" 
            :disabled="loading || !url"
            @click="fetchInfo"
          >
            <span v-if="loading" class="spinner"></span>
            <span v-else>Fetch</span>
          </button>
        </div>
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>

      <Transition name="fade">
        <div v-if="videoInfo" class="video-card">
          <div class="video-thumbnail">
            <img :src="videoInfo.thumbnail" :alt="videoInfo.title" />
            <span class="duration">{{ formatDuration(videoInfo.duration) }}</span>
            <span class="platform-badge" :class="videoInfo.platform">
              {{ videoInfo.platform === 'youtube' ? 'YouTube' : 'TikTok' }}
            </span>
          </div>
          <div class="video-info">
            <h2 class="video-title">{{ videoInfo.title }}</h2>
            <p class="video-uploader">{{ videoInfo.uploader }}</p>
            
            <div class="download-actions">
              <button 
                class="download-btn mp3"
                :disabled="downloading"
                @click="download('mp3')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <span>Download MP3</span>
              </button>
              <button 
                class="download-btn mp4"
                :disabled="downloading"
                @click="download('mp4')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
                </svg>
                <span>Download MP4</span>
              </button>
            </div>

            <div v-if="downloading" class="download-progress">
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <p>Downloading {{ downloadFormat?.toUpperCase() }}...</p>
            </div>
          </div>
        </div>
      </Transition>

      <footer class="footer">
        <p>Powered by yt-dlp • For personal use only</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  uploader: string
  url: string
  platform: 'youtube' | 'tiktok'
}

const url = ref('')
const loading = ref(false)
const error = ref('')
const videoInfo = ref<VideoInfo | null>(null)
const downloading = ref(false)
const downloadFormat = ref<'mp3' | 'mp4' | null>(null)

async function fetchInfo() {
  if (!url.value) return
  
  loading.value = true
  error.value = ''
  videoInfo.value = null

  try {
    const response = await $fetch<VideoInfo>('/api/info', {
      method: 'POST',
      body: { url: url.value },
    })
    videoInfo.value = response
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to fetch video info'
  } finally {
    loading.value = false
  }
}

async function download(format: 'mp3' | 'mp4') {
  if (!videoInfo.value) return

  downloading.value = true
  downloadFormat.value = format

  try {
    const downloadUrl = `/api/download?url=${encodeURIComponent(videoInfo.value.url)}&format=${format}`
    
    // Use window.open for better download handling
    window.open(downloadUrl, '_blank')
  } catch (e: any) {
    error.value = e.message || 'Download failed'
  } finally {
    // Keep showing progress for a moment
    setTimeout(() => {
      downloading.value = false
      downloadFormat.value = null
    }, 3000)
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style>
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --secondary: #22d3ee;
  --background: #0f0f1a;
  --surface: #1a1a2e;
  --surface-light: #252542;
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --success: #22c55e;
  --error: #ef4444;
  --youtube: #ff0000;
  --tiktok: #00f2ea;
  --gradient: linear-gradient(135deg, var(--primary), var(--secondary));
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--background);
  color: var(--text);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  background: 
    radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.15), transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(34, 211, 238, 0.1), transparent 50%),
    var(--background);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  padding: 3rem 0;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  width: 48px;
  height: 48px;
  color: var(--primary);
}

.logo h1 {
  font-size: 3rem;
  font-weight: 700;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.input-section {
  margin-bottom: 2rem;
}

.input-wrapper {
  display: flex;
  gap: 0.75rem;
  background: var(--surface);
  padding: 0.5rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 4px 30px rgba(99, 102, 241, 0.2);
}

.url-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 1rem 1.25rem;
  color: var(--text);
  font-size: 1rem;
  outline: none;
}

.url-input::placeholder {
  color: var(--text-muted);
}

.fetch-btn {
  padding: 1rem 2rem;
  background: var(--gradient);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fetch-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
}

.fetch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: var(--error);
  text-align: center;
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
}

.video-card {
  background: var(--surface);
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
}

.video-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.duration {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.platform-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.platform-badge.youtube {
  background: var(--youtube);
}

.platform-badge.tiktok {
  background: var(--tiktok);
  color: #000;
}

.video-info {
  padding: 1.5rem;
}

.video-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-uploader {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.download-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.download-btn svg {
  width: 20px;
  height: 20px;
}

.download-btn.mp3 {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.download-btn.mp3:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.download-btn.mp4 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.download-btn.mp4:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
}

.download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-progress {
  margin-top: 1.5rem;
  text-align: center;
}

.progress-bar {
  height: 4px;
  background: var(--surface-light);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-fill {
  height: 100%;
  background: var(--gradient);
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}

@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

.download-progress p {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.footer {
  margin-top: auto;
  padding-top: 3rem;
  text-align: center;
}

.footer p {
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Responsive */
@media (max-width: 640px) {
  .logo h1 {
    font-size: 2.25rem;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
  }

  .input-wrapper {
    flex-direction: column;
    padding: 0.75rem;
  }

  .fetch-btn {
    width: 100%;
  }

  .download-actions {
    grid-template-columns: 1fr;
  }
}
</style>
