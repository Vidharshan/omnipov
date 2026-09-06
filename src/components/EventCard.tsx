'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { ExternalLink, Video, QrCode, Download } from 'lucide-react'

interface EventCardProps {
  event: {
    id: string
    qr_slug: string
    google_folder_id: string
    is_active: boolean
    created_at: string
    media?: { count: number }[]
  }
}

export default function EventCard({ event }: EventCardProps) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [showQrModal, setShowQrModal] = useState(false)
  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/${event.qr_slug}` : `/${event.qr_slug}`
  const mediaCount = event.media?.[0]?.count || 0

  useEffect(() => {
    if (eventUrl) {
      QRCode.toDataURL(eventUrl, { width: 400, margin: 2 }, (err, url) => {
        if (!err) setQrUrl(url)
      })
    }
  }, [eventUrl])

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            /{event.qr_slug}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
            <Video className="w-3 h-3 text-indigo-400" /> {mediaCount} clips
          </span>
        </div>
        <h3 className="text-lg font-bold text-white capitalize">{event.qr_slug.replace(/-/g, ' ')}</h3>
        <p className="text-xs text-slate-400 font-mono truncate">Folder ID: {event.google_folder_id}</p>
      </div>

      <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
        <button
          onClick={() => setShowQrModal(true)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-2 rounded-lg transition-all"
        >
          <QrCode className="w-3.5 h-3.5" /> QR Kit
        </button>
        <a
          href={`/${event.qr_slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-all border border-indigo-500/20"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
            <div>
              <h3 className="text-lg font-bold text-white capitalize">{event.qr_slug.replace(/-/g, ' ')}</h3>
              <p className="text-xs text-slate-400 mt-1">Scan with phone camera to instantly start capturing</p>
            </div>

            {qrUrl && (
              <div className="p-4 bg-white rounded-xl flex items-center justify-center shadow-inner mx-auto w-48 h-48">
                <img src={qrUrl} alt="Event QR Code" className="w-full h-full" />
              </div>
            )}

            <p className="text-xs font-mono text-indigo-400 bg-slate-950 p-2 rounded-lg break-all border border-slate-800">
              {eventUrl}
            </p>

            <a
              href={qrUrl}
              download={`POV-Snap-${event.qr_slug}-QR.png`}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" /> Download Printable QR
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
