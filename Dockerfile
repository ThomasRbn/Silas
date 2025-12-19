# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production

WORKDIR /app

# Install yt-dlp, ffmpeg, and deno (for yt-dlp JS extraction)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built application from builder
COPY --from=builder /app/.output /app/.output

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV COOKIES_PATH=/app/cookies.txt
ENV DENO_DIR=/tmp/deno

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["bun", ".output/server/index.mjs"]

