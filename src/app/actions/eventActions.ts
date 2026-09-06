'use server'

import { createClient } from '@/utils/supabase/server'
import { getOAuth2Client, createEventFolder } from '@/lib/googleDrive'
import { redirect } from 'next/navigation'

export async function createNewEvent(formData: FormData) {
  const eventName = formData.get('eventName') as string
  const qrSlugInput = formData.get('qrSlug') as string

  if (!eventName || !qrSlugInput) {
    throw new Error('Event name and slug are required')
  }

  // Sanitize slug
  const qrSlug = qrSlugInput
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session || !session.user) {
    throw new Error('Unauthorized')
  }

  const providerToken = session.provider_token
  const refreshToken = session.provider_refresh_token

  // Ensure host record exists in 'hosts' table and fetch stored token
  let { data: host } = await supabase
    .from('hosts')
    .select('id, google_refresh_token')
    .eq('email', session.user.email!)
    .single()

  if (!host) {
    const { data: newHost, error: hostErr } = await supabase
      .from('hosts')
      .insert({
        email: session.user.email!,
        google_refresh_token: refreshToken || providerToken || 'token',
      })
      .select()
      .single()

    if (hostErr) throw new Error(hostErr.message)
    host = newHost
  }

  if (!host) {
    throw new Error('Failed to retrieve or create host record')
  }

  // Determine best token to use (providerToken from session or stored refresh token from DB)
  const tokenToUse = providerToken || host.google_refresh_token
  const refreshTokenToUse = refreshToken || host.google_refresh_token

  // Create folder on Google Drive
  const auth = getOAuth2Client(providerToken || undefined, refreshTokenToUse || undefined)
  if (!providerToken && !refreshTokenToUse) {
    throw new Error('No Google Drive authorization tokens found. Please sign out and sign in again via Google.')
  }
  const { folderId } = await createEventFolder(auth, eventName)

  // Create record in Supabase events table
  const { error: eventErr } = await supabase
    .from('events')
    .insert({
      qr_slug: qrSlug,
      host_id: host.id,
      google_folder_id: folderId,
      is_active: true,
    })

  if (eventErr) {
    throw new Error(eventErr.message)
  }

  redirect(`/dashboard?success=event-created&slug=${qrSlug}`)
}
