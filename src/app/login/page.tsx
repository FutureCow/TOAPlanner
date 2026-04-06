'use client'
import { Suspense, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Jouw account heeft geen toegang. Neem contact op met de beheerder.',
  RegistrationClosed: 'Nieuwe aanmeldingen zijn momenteel gesloten.',
  Default: 'Er is iets misgegaan. Probeer opnieuw.',
}

const SHOW_AZURE = Boolean(process.env.NEXT_PUBLIC_AZURE_AD_ENABLED)

function LoginContent() {
  const params = useSearchParams()
  const error = params.get('error')
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.schoolLogo) setSchoolLogo(d.schoolLogo) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

          {/* Logo + title */}
          <div className="flex flex-col items-center mb-8">
            {schoolLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={schoolLogo}
                alt="Schoollogo"
                className="h-12 w-auto object-contain mb-4 opacity-90"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 text-white text-xl font-bold shadow-lg">
                T
              </div>
            )}
            <h1 className="text-xl font-bold text-white tracking-tight">TOA Planner</h1>
            <p className="text-slate-500 text-sm mt-1">Practicum aanvragen</p>
          </div>

          {/* Error */}
          {message && (
            <div className="flex items-start gap-2.5 text-red-300 text-sm bg-red-950/60 border border-red-800/60 rounded-lg p-3 mb-5">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{message}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
            >
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
              </svg>
              Inloggen met Google
            </button>

            {SHOW_AZURE && (
              <button
                onClick={() => signIn('azure-ad', { callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors border border-slate-700 text-sm"
              >
                {/* Microsoft icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
                  <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
                  <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
                  <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
                </svg>
                Inloggen met Microsoft
              </button>
            )}
          </div>

          <p className="text-slate-600 text-xs text-center mt-6">
            Alleen voor medewerkers van de school
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
