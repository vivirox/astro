import React from 'react'
import { MentalHealthChatDemo } from '@/components/MentalHealthChatDemo'

export const metadata = {
  title: 'Mental Health Chat | MentalLLaMA Integration',
  description: 'Demo of the MentalLLaMA integration with our chat system',
}

export default function MentalHealthChatPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Mental Health Chat
        </h1>
        <p className="text-muted-foreground mb-6">
          Powered by MentalLLaMA - Interpretable Mental Health Analysis
        </p>

        <MentalHealthChatDemo />
      </div>
    </div>
  )
}
