import React from 'react'
import { SimulatorDashboard } from '@/components/dashboard/SimulatorDashboard'

export const metadata = {
  title: 'Therapeutic Practice Simulator | Real-Time Training',
  description:
    'Real-time therapeutic practice simulation with private, HIPAA-compliant feedback',
}

export default function SimulatorPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col items-center justify-center w-full mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Therapeutic Practice Simulator
        </h1>
        <p className="text-muted-foreground mb-6">
          Real-time practice environment with zero data retention and immediate
          feedback
        </p>

        <SimulatorDashboard />
      </div>
    </div>
  )
}
