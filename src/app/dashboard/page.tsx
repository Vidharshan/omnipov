import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createNewEvent } from '@/app/actions/eventActions'
import EventCard from '@/components/EventCard'
import { Plus, HardDrive, LogOut, Sparkles } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/')
  }

  // Get Host ID
  const { data: host } = await supabase
    .from('hosts')
    .select('*')
    .eq('email', user.email!)
    .single()

  let events: any[] = []
  if (host) {
    const { data: eventsData } = await supabase
      .from('events')
      .select('*, media(count)')
      .eq('host_id', host.id)
      .order('created_at', { ascending: false })
    events = eventsData || []
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      {/* Top Navbar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            POV
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">POV-Snap Host Portal</h1>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>

        <form action={async () => {
          'use server'
          const supabase = await createClient()
          await supabase.auth.signOut()
          redirect('/')
        }}>
          <button className="flex items-center gap-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 py-2 px-4 rounded-xl transition-all">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto mt-10 space-y-10">
        {/* Storage Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-900/40 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                Bring Your Own Storage Active
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Google Drive Sync
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Videos recorded by guests at your events stream directly into your personal Google Drive account.
              </p>
            </div>
          </div>
        </div>

        {/* Event List Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Your Events</h2>
              <p className="text-sm text-slate-400">Manage live video capture sessions & print QR placement kits</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Event Card */}
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-center items-center text-center group min-h-[220px]">
              <div className="p-3 rounded-xl bg-slate-800 group-hover:bg-indigo-600 transition-all text-slate-300 group-hover:text-white mb-3 shadow-lg">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-white text-base">Create New Event</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Generate a instant QR code & link for guests</p>
              
              {/* Inline Form Modal Trigger / Action */}
              <form action={createNewEvent} className="w-full mt-4 space-y-3">
                <input
                  type="text"
                  name="eventName"
                  placeholder="Event Name (e.g. Wedding 2026)"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  name="qrSlug"
                  placeholder="Custom Slug (e.g. smith-wedding)"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Launch Event
                </button>
              </form>
            </div>

            {/* Event List Rendering */}
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
