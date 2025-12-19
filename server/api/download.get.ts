import { spawn } from 'child_process'
import { createReadStream, statSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

// Cookie file path - can be set via environment variable
const COOKIES_PATH = process.env.COOKIES_PATH || '/app/cookies.txt'

function getCookieArgs(): string[] {
    if (existsSync(COOKIES_PATH)) {
        return ['--cookies', COOKIES_PATH]
    }
    return []
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const { url, format } = query as { url: string; format: 'mp3' | 'mp4' }

    if (!url || !format) {
        throw createError({
            statusCode: 400,
            statusMessage: 'URL and format are required',
        })
    }

    if (!['mp3', 'mp4'].includes(format)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Format must be mp3 or mp4',
        })
    }

    const tempId = randomUUID()
    const tempDir = tmpdir()
    const outputTemplate = join(tempDir, `${tempId}.%(ext)s`)

    try {
        const { filePath, title } = await downloadMedia(url, format, outputTemplate, tempId, tempDir)

        // Get file stats
        const stats = statSync(filePath)
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9\-_\s]/g, '').substring(0, 100)

        // Set response headers
        setHeaders(event, {
            'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
            'Content-Disposition': `attachment; filename="${sanitizedTitle}.${format}"`,
            'Content-Length': stats.size.toString(),
        })

        // Stream the file
        const stream = createReadStream(filePath)

        // Clean up file after streaming
        stream.on('close', () => {
            try {
                if (existsSync(filePath)) {
                    unlinkSync(filePath)
                }
            } catch (e) {
                console.error('Failed to clean up temp file:', e)
            }
        })

        return sendStream(event, stream)
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Download failed',
        })
    }
})

interface DownloadResult {
    filePath: string
    title: string
}

function downloadMedia(
    url: string,
    format: 'mp3' | 'mp4',
    outputTemplate: string,
    tempId: string,
    tempDir: string
): Promise<DownloadResult> {
    return new Promise((resolve, reject) => {
        const cookieArgs = getCookieArgs()
        console.log(`[download] Starting download: ${url} as ${format}`)
        console.log(`[download] Output template: ${outputTemplate}`)
        console.log(`[download] Cookie args: ${JSON.stringify(cookieArgs)}`)

        const args: string[] = [
            '--no-warnings',
            '--no-playlist',
            '-o', outputTemplate,
            ...cookieArgs,
        ]

        if (format === 'mp3') {
            args.push(
                '-x', // Extract audio
                '--audio-format', 'mp3',
                '--audio-quality', '0', // Best quality
            )
        } else {
            args.push(
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
            )
        }

        args.push(url)
        console.log(`[download] Full command: yt-dlp ${args.join(' ')}`)

        const ytdlp = spawn('yt-dlp', args)
        let stderr = ''
        let stdout = ''
        let title = 'download'

        ytdlp.stderr.on('data', (data: Buffer) => {
            stderr += data.toString()
        })

        ytdlp.stdout.on('data', (data: Buffer) => {
            const output = data.toString()
            const titleMatch = output.match(/\[download\] Destination: .*?([^\/]+)\.(mp3|mp4|webm|m4a)/)
            if (titleMatch) {
                title = titleMatch[1].replace(tempId + '.', '')
            }
        })

        ytdlp.on('close', (code: number | null) => {
            console.log(`[download] yt-dlp exited with code: ${code}`)
            console.log(`[download] stderr: ${stderr}`)

            if (code !== 0) {
                if (stderr.includes('Sign in to confirm')) {
                    reject(new Error('YouTube requires authentication. Please add cookies.txt file.'))
                } else {
                    reject(new Error(stderr || 'Download failed'))
                }
                return
            }

            const ext = format === 'mp3' ? 'mp3' : 'mp4'
            const expectedPath = join(tempDir, `${tempId}.${ext}`)
            console.log(`[download] Looking for file: ${expectedPath}`)
            console.log(`[download] File exists: ${existsSync(expectedPath)}`)

            if (existsSync(expectedPath)) {
                const titleProcess = spawn('yt-dlp', ['--get-title', '--no-warnings', ...getCookieArgs(), url])
                let titleOutput = ''

                titleProcess.stdout.on('data', (data: Buffer) => {
                    titleOutput += data.toString()
                })

                titleProcess.on('close', () => {
                    resolve({
                        filePath: expectedPath,
                        title: titleOutput.trim() || 'download',
                    })
                })

                titleProcess.on('error', () => {
                    resolve({
                        filePath: expectedPath,
                        title: 'download',
                    })
                })
            } else {
                reject(new Error('Output file not found'))
            }
        })

        ytdlp.on('error', () => {
            reject(new Error('yt-dlp not found. Please install it: brew install yt-dlp'))
        })
    })
}
