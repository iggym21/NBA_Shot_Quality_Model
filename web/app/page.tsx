'use client'

import { useState } from 'react'
import TabNav from '@/components/TabNav'
import type { Tab } from '@/components/TabNav'
import ShotPredictor from '@/components/predictor/ShotPredictor'
import TeamDashboard from '@/components/dashboard/TeamDashboard'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('predictor')

  return (
    <main>
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ padding: '28px 24px', maxWidth: '960px', margin: '0 auto' }}>
        {activeTab === 'predictor' ? <ShotPredictor /> : <TeamDashboard />}
      </div>
    </main>
  )
}
