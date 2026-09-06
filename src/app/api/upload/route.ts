import { NextResponse } from 'next/server'
import { initResumableUploadSession, logUploadedMedia } from '@/app/actions/uploadActions'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const fileName = searchParams.get('fileName') || `POV_Clip_${Date.now()}.mp4`
    const mimeType = searchParams.get('mimeType') || 'video/mp4'

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // 1. Get raw binary arrayBuffer from client request
    const fileBuffer = await request.arrayBuffer()
    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'No video payload received' }, { status: 400 })
    }

    // 2. Initialize Resumable Session with Google Drive
    const { uploadUrl, eventId } = await initResumableUploadSession(
      slug,
      fileName,
      mimeType
    )

    // 3. Upload binary stream from server to Google Drive
    const driveRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.byteLength.toString(),
      },
      body: fileBuffer,
    })

    if (!driveRes.ok && driveRes.status !== 200 && driveRes.status !== 201) {
      const errText = await driveRes.text()
      console.error('Google Drive Upload Failed:', errText)
      return NextResponse.json({ error: 'Google Drive upload failed' }, { status: 500 })
    }

    const responseData = await driveRes.json()
    const googleFileId = responseData.id
    const viewUrl = `https://drive.google.com/file/d/${googleFileId}/preview`
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${googleFileId}&sz=w800`

    // 4. Log uploaded media into Supabase
    const newMedia = await logUploadedMedia(
      eventId,
      googleFileId,
      viewUrl,
      thumbnailUrl
    )

    return NextResponse.json({ success: true, media: newMedia })
  } catch (err: any) {
    console.error('Upload Error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
