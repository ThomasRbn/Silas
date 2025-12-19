import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

interface VideoInfo {
    title: string
    thumbnail: string
    duration: number
    uploader: string
    url: string
    platform: 'youtube' | 'tiktok'
    formats: {
        audio: { format_id: string; ext: string; quality: string }[]
        video: { format_id: string; ext: string; quality: string; resolution: string }[]
    }
}

// Cookie file path - can be set via environment variable
const COOKIES_PATH = process.env.COOKIES_PATH || '/app/cookies.txt'

function getCookieArgs(): string[] {
    const exists = existsSync(COOKIES_PATH)
    console.log(`[yt-dlp] Cookies file path: ${COOKIES_PATH}`)
    console.log(`[yt-dlp] Cookies file exists: ${exists}`)

    if (exists) {
        return ['--cookies', COOKIES_PATH]
    }
    // Fallback: try common browser cookie extraction (local dev only)
    return []
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { url } = body

    if (!url) {
        throw createError({
            statusCode: 400,
            statusMessage: 'URL is required',
        })
    }

    // Validate URL
    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url)
    const isTikTok = /tiktok\.com/i.test(url)

    if (!isYouTube && !isTikTok) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Only YouTube and TikTok URLs are supported',
        })
    }

    try {
        const info = await getVideoInfo(url)
        return {
            ...info,
            platform: isYouTube ? 'youtube' : 'tiktok',
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Failed to fetch video info',
        })
    }
})

function getVideoInfo(url: string): Promise<Omit<VideoInfo, 'platform'>> {
    return new Promise((resolve, reject) => {
        const cookieArgs = getCookieArgs()

        const args = [
            '--dump-json',
            '--no-warnings',
            '--no-playlist',
            ...cookieArgs,
            url,
        ]

        const ytdlp = spawn('yt-dlp', args)
        let stdout = ''
        let stderr = ''

        ytdlp.stdout.on('data', (data: Buffer) => {
            stdout += data.toString()
        })

        ytdlp.stderr.on('data', (data: Buffer) => {
            stderr += data.toString()
        })

        ytdlp.on('close', (code: number | null) => {
            if (code !== 0) {
                // Check for bot detection error
                if (stderr.includes('Sign in to confirm')) {
                    reject(new Error('YouTube requires authentication. Please add cookies.txt file.'))
                } else {
                    reject(new Error(stderr || 'yt-dlp process failed'))
                }
                return
            }

            try {
                const data = JSON.parse(stdout)

                // Extract audio formats
                const audioFormats = (data.formats || [])
                    .filter((f: any) => f.acodec !== 'none' && f.vcodec === 'none')
                    .map((f: any) => ({
                        format_id: f.format_id,
                        ext: f.ext,
                        quality: f.abr ? `${f.abr}kbps` : 'unknown',
                    }))
                    .slice(-5)

                // Extract video formats
                const videoFormats = (data.formats || [])
                    .filter((f: any) => f.vcodec !== 'none' && f.acodec !== 'none')
                    .map((f: any) => ({
                        format_id: f.format_id,
                        ext: f.ext,
                        quality: f.format_note || 'unknown',
                        resolution: f.resolution || `${f.width}x${f.height}`,
                    }))
                    .slice(-5)

                resolve({
                    title: data.title,
                    thumbnail: data.thumbnail,
                    duration: data.duration,
                    uploader: data.uploader || data.channel || 'Unknown',
                    url: url,
                    formats: {
                        audio: audioFormats,
                        video: videoFormats,
                    },
                })
            } catch (parseError) {
                reject(new Error('Failed to parse video info'))
            }
        })

        ytdlp.on('error', () => {
            reject(new Error('yt-dlp not found. Please install it: brew install yt-dlp'))
        })
    })
}
