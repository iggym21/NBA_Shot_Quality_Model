'use client'

import { useState } from 'react'
import TabNav from '@/components/TabNav'

type Tab = 'predictor' | 'dashboard'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('predictor')

  return (
    <main>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ padding: '28px 24px', maxWidth: '960px', margin: '0 auto' }}>
        {activeTab === 'predictor' ? (
          <p style={{ color: 'var(--text-muted)' }}>Predictor placeholder</p>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Dashboard placeholder</p>
        )}
      </div>
    </main>
  )
}
