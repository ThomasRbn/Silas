# Silas

A modern web application to convert YouTube and TikTok videos to MP3/MP4 formats. Built with Nuxt 4 and powered by yt-dlp.

![Nuxt](https://img.shields.io/badge/Nuxt-4.2-00DC82?logo=nuxt.js)
![Bun](https://img.shields.io/badge/Bun-1.x-fbf0df?logo=bun)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

## Features

- 🎵 **YouTube to MP3/MP4** - Download audio or video from YouTube
- 📱 **TikTok Support** - Download TikTok videos
- 🎨 **Modern UI** - Beautiful dark theme with glassmorphism design
- 🔐 **Cloudflare Access** - Built-in logout support for protected deployments
- 🐳 **Docker Ready** - Easy deployment with Docker and Coolify

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed locally (for development)
- [ffmpeg](https://ffmpeg.org/) (for MP3 conversion)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Silas.git
cd Silas

# Install dependencies
bun install
```

## Configuration

### Environment Variables

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `COOKIES_PATH` | Path to YouTube cookies file | `/app/cookies.txt` |

### YouTube Authentication (Optional)

For age-restricted or private videos, you need to provide YouTube cookies:

1. Install the "Get cookies.txt LOCALLY" browser extension
2. Go to youtube.com and make sure you're logged in
3. Export cookies using the extension
4. Save as `cookies.txt` in the project root

See `cookies.txt.example` for more details.

## Development

Start the development server on `http://localhost:3000`:

```bash
bun dev
```

## Production

### Build locally

```bash
bun run build
bun run preview
```

### Docker

Build and run with Docker:

```bash
# Build the image
docker build -t silas .

# Run the container
docker run -p 3000:3000 -v ./cookies.txt:/app/cookies.txt:ro silas
```

Or use Docker Compose:

```bash
docker-compose up -d
```

### Coolify Deployment

1. Create a new service from this Git repository
2. Select "Dockerfile" as the build method
3. Add a secret file for `cookies.txt` mounted at `/app/cookies.txt`
4. Deploy!

## Project Structure

```
Silas/
├── app/
│   └── app.vue          # Main application component
├── server/
│   └── api/
│       ├── info.post.ts   # Fetch video metadata
│       └── download.get.ts # Download video/audio
├── public/              # Static assets
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
└── nuxt.config.ts       # Nuxt configuration
```

## API Endpoints

### POST /api/info

Fetch video information from a URL.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

**Response:**
```json
{
  "title": "Video Title",
  "thumbnail": "https://...",
  "duration": 180,
  "uploader": "Channel Name",
  "url": "https://...",
  "platform": "youtube"
}
```

### GET /api/download

Download video as MP3 or MP4.

**Query Parameters:**
- `url` - Video URL
- `format` - `mp3` or `mp4`
- `title` - Video title (for filename)

## License

MIT
