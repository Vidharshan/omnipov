# Omni POV — structural map

## Purpose

Omni POV (currently branded **POV-Snap** in the UI) is a Next.js web app for
event hosts to create QR-addressable capture rooms. Guests open `/{slug}`,
record/select a video through the native device picker, and upload it to the
host's Google Drive; Supabase stores the event, host authorization reference,
and gallery metadata.

## Primary stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| App/UI | Next.js 16.3 App Router, React 19, TypeScript | Server-rendered routes, client capture UI, API routes, Server Actions |
| Styling | Tailwind CSS 4 | Global styles and component layout |
| Auth/data | Supabase Auth + PostgreSQL, via `@supabase/ssr` | Google OAuth session cookies and host/event/media records |
| External storage | Google Drive API via `googleapis` | Creates event folders, grants link-read access, receives uploaded files |
| QR/UI utilities | `qrcode`, `lucide-react` | Client-generated event QR images and interface icons |

## Runtime configuration and cross-cutting dependencies

- TypeScript alias `@/*` resolves to `src/*`.
- Supabase clients require `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server and browser client factories live in
  `src/utils/supabase/`.
- Google Drive OAuth requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
  optionally `NEXT_PUBLIC_BASE_URL` to construct the OAuth callback URL.
- `src/middleware.ts` runs `updateSession` on almost all application routes to
  refresh Supabase auth cookies. Static assets and the favicon are excluded.
- `src/app/layout.tsx` supplies Geist fonts and imports `globals.css` (the
  Tailwind entry point) for every route.

## Route and module map

| Entry point | Depends on | Produces / responsibility |
| --- | --- | --- |
| `src/app/page.tsx` (`/`) | server Supabase client; `next/headers`; Supabase Google OAuth | Landing/login. Redirects authenticated hosts to `/dashboard`; otherwise starts Google OAuth with Drive `drive.file`, email, and profile scopes. |
| `src/app/api/auth/callback/route.ts` | server Supabase client | Exchanges OAuth authorization code for a Supabase session, upserts `hosts` by email with the returned Google token, then redirects to `/dashboard`. |
| `src/app/dashboard/page.tsx` (`/dashboard`) | server Supabase client; `createNewEvent`; `EventCard` | Authenticated host portal. Looks up the host by session email and queries its events with media counts. |
| `src/app/actions/eventActions.ts` | server Supabase client; `src/lib/googleDrive.ts`; `next/navigation` | `createNewEvent`: validates/sanitizes form input, creates or finds the host row, creates a Drive folder, and inserts the event. |
| `src/components/EventCard.tsx` | `qrcode`; browser `window` | Renders an event dashboard card, generates a data-URL QR code for `/{qr_slug}`, and links guests to the event page. |
| `src/app/[slug]/page.tsx` (`/{slug}`) | server Supabase client; `SnapLensClient` | Public guest entry. Loads the matching event and its media timeline, or returns `notFound()`. |
| `src/components/SnapLensClient.tsx` | browser localStorage; `POST /api/upload` | Client-only mobile capture, local preview, XHR progress UI, event history, and initial/live-in-memory gallery state. |
| `src/app/api/upload/route.ts` (`POST /api/upload`) | `initResumableUploadSession`; `logUploadedMedia`; Google Drive upload URL | Reads the full uploaded request body, initializes a Drive resumable session, proxies the binary file to Drive, then persists file metadata to `media`. |
| `src/app/actions/uploadActions.ts` | server Supabase client; `src/lib/googleDrive.ts`; Google upload endpoint | Looks up an event plus host token, obtains a Google access token, creates a resumable upload session, and inserts completed-media metadata. |
| `src/lib/googleDrive.ts` | `googleapis`; Google OAuth/Drive APIs | Builds OAuth2 clients, reads storage quota (currently unused), creates an event folder, and changes folder sharing to anyone-with-link reader. |

## Data model

Schema source: `supabase/migrations/20260905_init.sql`.

```text
Supabase Auth user (Google session)
        │ email
        ▼
hosts ──────< events ──────< media
 id             id             id
 email          qr_slug        google_file_id
 google_...     host_id        thumbnail_url
                google_folder  view_url
```

- `hosts`: one row per host email; stores the Google refresh/access token field
  used to obtain Drive access.
- `events`: an active, unique `qr_slug` and its Google Drive folder; each event
  belongs to a host (`ON DELETE CASCADE`).
- `media`: a gallery record pointing to a Google Drive file; each item belongs
  to an event (`ON DELETE CASCADE`). The schema indexes event slugs and media
  timelines by creation date.

## End-to-end flows

### Host onboarding and event creation

```text
Host → / (Google OAuth) → Supabase Auth callback
     → hosts upsert → /dashboard
     → createNewEvent Server Action
     → Google Drive: create shared folder
     → Supabase: events insert → EventCard QR for /{slug}
```

### Guest capture and gallery update

```text
Guest → /{slug} Server Component → Supabase: event + media
      → SnapLensClient → native video input/preview
      → XHR POST /api/upload?slug=...
      → upload route → initResumableUploadSession
      → Supabase: event + host token → Google OAuth access token
      → Google Drive: resumable session, then binary upload
      → Supabase: media insert → JSON response → client gallery state
```

The browser currently uploads the selected file to the Next.js API route first;
the route then forwards it to Google Drive. Although a Google resumable session
is created, client-side direct chunk streaming is not the implemented path.

## Browser-local state

- `SnapLensClient` stores visited event slugs in
  `localStorage.pov_history_slugs`; it is only an anonymous device footprint.
- Selected video previews use an object URL and upload progress comes from an
  `XMLHttpRequest` upload event.
- The gallery starts with server-provided `initialMedia` and prepends a newly
  logged media record after a successful upload; no realtime subscription or
  polling is present.

## Repository boundaries

- `public/` contains only the default scaffold SVG assets.
- `supabase/config.toml` provides local Supabase CLI configuration; migration
  state is held under `supabase/migrations/`.
- `README.md` remains the default Next.js scaffold documentation. `prd.md`
  describes the intended product architecture; this map describes the code
  currently present.
