'use client'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Jouw account heeft geen toegang. Neem contact op met de beheerder.',
  RegistrationClosed: 'Nieuwe aanmeldingen zijn momenteel gesloten.',
  Default: 'Er is iets misgegaan. Probeer opnieuw.',
}

export default function LoginPage() {
  const params = useSearchParams()
  const error = params.get('error')
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-white mb-2">TOA Planner</h1>
        <p className="text-slate-400 text-sm mb-6">De Amersfoortse Berg</p>
        {message && (
          <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded p-3 mb-4">
            {message}
          </p>
        )}
        <button
          onClick={() => signIn('google', { callbackUrl: '/natuurkunde' })}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Inloggen met Google
        </button>
      </div>
    </div>
  )
}
