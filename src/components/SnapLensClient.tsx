'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Film, History, Send, CheckCircle2, Play, Sparkles, RefreshCw } from 'lucide-react'

interface MediaItem {
  id: string
  created_at: string
  thumbnail_url: string
  view_url: string
}

interface EventRecord {
  qr_slug: string
}

interface SnapLensProps {
  slug: string
  event: EventRecord
  initialMedia: MediaItem[]
}

export default function SnapLensClient({ slug, event, initialMedia }: SnapLensProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'capture' | 'gallery'>('capture')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [mediaList, setMediaList] = useState(initialMedia)
  const [historySlugs, setHistorySlugs] = useState<string[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Store local history of visited event slugs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('pov_history_slugs') || '[]')
      if (!stored.includes(slug)) {
        const updated = [slug, ...stored]
        localStorage.setItem('pov_history_slugs', JSON.stringify(updated))
        queueMicrotask(() => setHistorySlugs(updated))
      } else {
        queueMicrotask(() => setHistorySlugs(stored))
      }
    }
  }, [slug])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setUploadSuccess(false)
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const triggerCamera = () => {
    fileInputRef.current?.click()
  }

  const handleSendVideo = async () => {
    if (!selectedFile) return
    try {
      setUploading(true)
      setUploadProgress(10)

      const uploadEndpoint = `/api/upload?slug=${encodeURIComponent(slug)}&fileName=${encodeURIComponent(selectedFile.name)}&mimeType=${encodeURIComponent(selectedFile.type || 'video/mp4')}`

      const xhr = new XMLHttpRequest()
      xhr.open('POST', uploadEndpoint, true)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 90)
          setUploadProgress(percent)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const res = JSON.parse(xhr.responseText)
            if (res.success && res.media) {
              setMediaList((prev) => [res.media, ...prev])
              setUploading(false)
              setUploadSuccess(true)
              setUploadProgress(100)
              setTimeout(() => {
                setSelectedFile(null)
                setPreviewUrl(null)
                setActiveTab('gallery')
              }, 1500)
            } else {
              alert(res.error || 'Upload failed')
              setUploading(false)
            }
          } catch {
            alert('Invalid server response')
            setUploading(false)
          }
        } else {
          alert('Upload failed with status ' + xhr.status)
          setUploading(false)
        }
      }

      xhr.onerror = () => {
        alert('Network error during upload')
        setUploading(false)
      }

      xhr.send(selectedFile)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload video'
      alert(message)
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Hidden Native Camera Input */}
      <input
        type="file"
        accept="video/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        id="camera-trigger"
      />

      {/* Header Overlay */}
      <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-sm font-bold tracking-wide uppercase text-white/90 drop-shadow">
            {event.qr_slug.replace(/-/g, ' ')}
          </h2>
        </div>
        <span className="text-[10px] bg-white/10 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 text-white/80">
          Live POV Capture
        </span>
      </div>

      {/* Main View Area depending on Active Tab */}
      <div className="flex-1 relative w-full h-full flex flex-col justify-center items-center">
        {/* CAPTURE TAB */}
        {activeTab === 'capture' && (
          <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-950">
            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  src={previewUrl}
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Preview Action Controls */}
                <div className="absolute bottom-24 inset-x-0 z-30 flex flex-col items-center px-6 gap-4">
                  {uploading ? (
                    <div className="w-full max-w-xs bg-black/80 backdrop-blur-md border border-white/20 p-4 rounded-2xl space-y-2 text-center animate-in fade-in">
                      <div className="flex justify-between text-xs text-slate-300 font-mono">
                        <span>Streaming to Drive...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : uploadSuccess ? (
                    <div className="flex items-center gap-2 bg-emerald-500/90 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-lg animate-bounce">
                      <CheckCircle2 className="w-5 h-5" /> Sent to Collective Gallery!
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 w-full max-w-xs">
                      <button
                        onClick={() => {
                          setSelectedFile(null)
                          setPreviewUrl(null)
                        }}
                        className="p-4 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/30 transition-all"
                      >
                        <RefreshCw className="w-6 h-6" />
                      </button>
                      <button
                        onClick={handleSendVideo}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-full shadow-xl shadow-indigo-600/40 text-lg transition-all active:scale-95"
                      >
                        <Send className="w-5 h-5" /> Send Clip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-xs">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center animate-pulse">
                    <Camera className="w-10 h-10 text-indigo-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Record Event Moment</h3>
                    <p className="text-xs text-slate-400 mt-1">
                    Tap below to open your camera and capture a raw fragment for the host&apos;s cloud gallery.
                  </p>
                </div>
                <button
                  onClick={triggerCamera}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 px-6 rounded-full shadow-2xl hover:bg-slate-100 transition-all active:scale-95 text-base"
                >
                  <Camera className="w-5 h-5 text-indigo-600" /> Open Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="w-full h-full pt-16 pb-20 px-4 overflow-y-auto bg-slate-950">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-300">Collective Event Gallery</h3>
              <span className="text-xs text-indigo-400 font-mono">{mediaList.length} clips uploaded</span>
            </div>

            {mediaList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-3">
                <Film className="w-12 h-12 stroke-1" />
                <p className="text-xs">No videos uploaded yet. Be the first!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mediaList.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMedia(item)}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail_url || item.view_url}
                      alt="Uploaded video thumbnail"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                      <span className="text-[10px] text-white/80 font-medium">Tap to open preview</span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-2 flex items-end justify-between gap-2">
                      <span className="text-[10px] text-white/70 font-mono">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] text-white/60 font-mono bg-black/30 px-2 py-0.5 rounded-full">
                        Preview
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="w-full h-full pt-16 pb-20 px-6 overflow-y-auto bg-slate-950 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Your Visited Events</h3>
              <p className="text-xs text-slate-400 mt-1">
                Anonymous footprint stored on your device
              </p>
            </div>

            <div className="space-y-3">
              {historySlugs.map((itemSlug) => (
                <div
                  key={itemSlug}
                  className={`p-4 rounded-xl border flex items-center justify-between ${itemSlug === slug ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-slate-900 border-slate-800'}`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-white capitalize">{itemSlug.replace(/-/g, ' ')}</h4>
                    <p className="text-[10px] font-mono text-slate-400">/{itemSlug}</p>
                  </div>
                  {itemSlug === slug && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-medium border border-indigo-500/30">
                      Active Now
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Commercial Upsell Banner as per PRD Section 5.5 */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-violet-950 via-slate-900 to-indigo-950 border border-violet-500/30 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs">
                <Sparkles className="w-4 h-4" /> Consolidated Highlight Edit
              </div>
              <h4 className="text-sm font-bold text-white">Want an automated highlight reel?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Stitch all your historical event POV clips into a single HD video highlight Reel automatically.
              </p>
              <button className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition-all">
                Unlock Highlight Reel ($4.99)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Mobile Navigation Tabs */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/80 flex items-center justify-around z-40">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${activeTab === 'history' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <History className="w-5 h-5" /> History
        </button>
        <button
          onClick={() => setActiveTab('capture')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${activeTab === 'capture' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <div className={`p-2 rounded-full -mt-4 border-4 border-slate-950 ${activeTab === 'capture' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/50' : 'bg-slate-800 text-slate-300'}`}>
            <Camera className="w-6 h-6" />
          </div>
          Capture
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${activeTab === 'gallery' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Film className="w-5 h-5" /> Gallery
        </button>
      </div>

      {selectedMedia && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-semibold text-white">Clip preview</h4>
                <p className="text-[11px] text-slate-400 font-mono truncate">{selectedMedia.view_url}</p>
              </div>
              <button
                onClick={() => setSelectedMedia(null)}
                className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700"
              >
                Close
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={selectedMedia.view_url}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
