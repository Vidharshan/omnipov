'use server'

import { createClient } from '@/utils/supabase/server'
import { getOAuth2Client } from '@/lib/googleDrive'
import { google } from 'googleapis'

export async function initResumableUploadSession(slug: string, fileName: string, mimeType: string) {
  const supabase = await createClient()
  
  // 1. Fetch Event and Host Details
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('*, hosts(*)')
    .eq('qr_slug', slug)
    .single()

  if (eventErr || !event) {
    throw new Error('Event not found')
  }

  const host = event.hosts
  if (!host) {
    throw new Error('Host metadata missing')
  }

  const auth = getOAuth2Client(undefined, host.google_refresh_token)
  const tokenRes = await auth.getAccessToken()
  const accessToken = tokenRes.token

  if (!accessToken) {
    throw new Error('Failed to obtain Google access token')
  }

  // 2. Request Resumable Upload Session URI directly from Google Drive API
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType || 'video/mp4',
      },
      body: JSON.stringify({
        name: fileName || `POV_Clip_${Date.now()}.mp4`,
        parents: [event.google_folder_id],
      }),
    }
  )

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) {
    throw new Error('Failed to create resumable upload session')
  }

  return {
    uploadUrl,
    eventId: event.id,
  }
}

export async function logUploadedMedia(
  eventId: string,
  googleFileId: string,
  viewUrl: string,
  thumbnailUrl?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('media')
    .insert({
      event_id: eventId,
      google_file_id: googleFileId,
      thumbnail_url: thumbnailUrl || viewUrl,
      view_url: viewUrl,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
