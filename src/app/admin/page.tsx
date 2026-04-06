'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import RequestsTab from '@/components/admin/RequestsTab'
import UsersTab from '@/components/admin/UsersTab'
import SettingsTab from '@/components/admin/SettingsTab'

type Tab = 'requests' | 'users' | 'settings'

const TAB_LABELS: Record<Tab, string> = {
  requests: '📋 Aanvragen',
  users: '👥 Gebruikers',
  settings: '⚙️ Instellingen',
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<Tab>('requests')

  if (status === 'loading') return null
  if (!session || !session.user.isAdmin) redirect('/natuurkunde')

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Admin</h1>
      <div className="flex gap-2 mb-4">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors min-w-[8rem] text-center ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === 'requests' && <RequestsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}
