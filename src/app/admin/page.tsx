'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import RequestsTab from '@/components/admin/RequestsTab'
import UsersTab from '@/components/admin/UsersTab'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<'requests' | 'users'>('requests')

  if (status === 'loading') return null
  if (!session || !session.user.isAdmin) redirect('/natuurkunde')

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Admin</h1>
      <div className="flex gap-2 mb-4">
        {(['requests', 'users'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {t === 'requests' ? '📋 Aanvragen' : '👥 Gebruikers'}
          </button>
        ))}
      </div>
      {tab === 'requests' ? <RequestsTab /> : <UsersTab />}
    </div>
  )
}
