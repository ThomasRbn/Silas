import { spawn } from 'child_process'
import { createReadStream, statSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

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
        const args: string[] = [
            '--no-warnings',
            '--no-playlist',
            '-o', outputTemplate,
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

        const process = spawn('yt-dlp', args)
        let stderr = ''
        let title = 'download'

        process.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        process.stdout.on('data', (data) => {
            const output = data.toString()
            // Try to extract title from output
            const titleMatch = output.match(/\[download\] Destination: .*?([^\/]+)\.(mp3|mp4|webm|m4a)/)
            if (titleMatch) {
                title = titleMatch[1].replace(tempId + '.', '')
            }
        })

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || 'Download failed'))
                return
            }

            // Find the output file
            const ext = format === 'mp3' ? 'mp3' : 'mp4'
            const expectedPath = join(tempDir, `${tempId}.${ext}`)

            if (existsSync(expectedPath)) {
                // Get the title from yt-dlp
                const titleProcess = spawn('yt-dlp', ['--get-title', '--no-warnings', url])
                let titleOutput = ''

                titleProcess.stdout.on('data', (data) => {
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

        process.on('error', () => {
            reject(new Error('yt-dlp not found. Please install it: brew install yt-dlp'))
        })
    })
}
