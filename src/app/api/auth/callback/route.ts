import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
      const user = data.session.user
      const providerToken = data.session.provider_token
      const refreshToken = data.session.provider_refresh_token

      if (user && user.email) {
        // Upsert host record with stored OAuth refresh/access token
        const tokenToStore = refreshToken || providerToken || ''
        await supabase.from('hosts').upsert(
          {
            email: user.email,
            google_refresh_token: tokenToStore,
          },
          { onConflict: 'email' }
        )
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?error=auth-failed`)
}
