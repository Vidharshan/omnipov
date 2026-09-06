import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import SnapLensClient from '@/components/SnapLensClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EventGuestPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch event
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('qr_slug', slug)
    .single()

  if (error || !event) {
    notFound()
  }

  // Fetch media for gallery
  const { data: media } = await supabase
    .from('media')
    .select('id, event_id, google_file_id, thumbnail_url, view_url, created_at')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })

  return (
    <SnapLensClient
      slug={slug}
      event={event}
      initialMedia={media || []}
    />
  )
}
