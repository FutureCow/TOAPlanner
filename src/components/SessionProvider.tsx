'use client'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

function BfcacheReloader() {
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])
  return null
}

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus={true}>
      <BfcacheReloader />
      {children}
    </NextAuthSessionProvider>
  )
}
