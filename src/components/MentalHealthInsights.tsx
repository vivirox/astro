import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import type { MentalHealthAnalysis } from '@/lib/chat/mentalHealthChat'

interface MentalHealthInsightsProps {
  analysis: MentalHealthAnalysis
  onRequestIntervention?: () => void
  showCharts?: boolean
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    depression: 'bg-blue-500',
    anxiety: 'bg-yellow-500',
    ptsd: 'bg-red-500',
    bipolar_disorder: 'bg-purple-500',
    ocd: 'bg-green-500',
    eating_disorder: 'bg-pink-500',
    social_anxiety: 'bg-indigo-500',
    panic_disorder: 'bg-orange-500',
    suicidality: 'bg-red-700',
    none: 'bg-gray-500',
  }

  return colors[category] || 'bg-gray-500'
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Component to display mental health insights from MentalLLaMA
 */
export function MentalHealthInsights({
  analysis,
  onRequestIntervention,
  showCharts = false,
}: MentalHealthInsightsProps) {
  const [expanded, setExpanded] = useState<boolean>(false)

  // If no mental health issue is detected, show a simplified card
  if (!analysis.hasMentalHealthIssue) {
    return (
      <Card className="w-full bg-slate-50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Mental Health Insights
          </CardTitle>
          <CardDescription className="text-xs">
            No significant mental health concerns detected
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Convert confidence to percentage
  const confidencePercent = Math.round(analysis.confidence * 100)

  // Format the evidence for display
  const evidenceItems = analysis.supportingEvidence.map((evidence, index) => (
    <li key={index} className="text-xs py-1">
      "{evidence}"
    </li>
  ))

  // Format data for the chart
  const chartData = [
    {
      name: 'Confidence',
      value: confidencePercent,
    },
  ]

  return (
    <Card className="w-full bg-slate-50 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">
            Mental Health Insights
          </CardTitle>
          <Badge
            className={`${getCategoryColor(
              analysis.category,
            )} text-white text-xs`}
          >
            {formatCategoryName(analysis.category)}
          </Badge>
        </div>
        <CardDescription className="text-xs flex items-center gap-2">
          <span>Confidence: {confidencePercent}%</span>
          {analysis.expertGuided && (
            <Badge variant="outline" className="text-xs">
              Expert-Guided
            </Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <Accordion
          type="single"
          collapsible
          value={expanded ? 'content' : undefined}
          onValueChange={(value) => setExpanded(value === 'content')}
        >
          <AccordionItem value="content" className="border-b-0">
            <AccordionTrigger className="text-xs py-2">
              Clinical Assessment
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p className="text-xs">{analysis.explanation}</p>

                {evidenceItems.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-xs font-medium mb-1">
                      Supporting Evidence:
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {evidenceItems}
                    </ul>
                  </div>
                )}

                {showCharts && (
                  <div className="h-24 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          fill={
                            confidencePercent > 80
                              ? '#ef4444'
                              : confidencePercent > 60
                                ? '#f97316'
                                : '#22c55e'
                          }
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      {onRequestIntervention && (
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestIntervention}
            className="text-xs w-full"
          >
            Request Therapeutic Support
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * Component to display mental health insights history in a summary chart
 */
export function MentalHealthHistoryChart({
  analysisHistory,
}: {
  analysisHistory: MentalHealthAnalysis[]
}) {
  // Skip if no history or all entries are "none" category
  if (
    analysisHistory.length === 0 ||
    analysisHistory.every(
      (a) => a.category === 'none' || !a.hasMentalHealthIssue,
    )
  ) {
    return null
  }

  // Prepare data for the chart - count occurrences of each category
  const categoryCounts = analysisHistory.reduce(
    (acc, analysis) => {
      if (analysis.hasMentalHealthIssue) {
        acc[analysis.category] = (acc[analysis.category] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  // Convert to array for the chart
  const chartData = Object.entries(categoryCounts).map(([category, count]) => ({
    name: formatCategoryName(category),
    value: count,
    fill: getCategoryColor(category).replace('bg-', '#').replace('-500', ''),
  }))

  return (
    <Card className="w-full bg-slate-50 shadow-sm mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Mental Health Patterns
        </CardTitle>
        <CardDescription className="text-xs">
          Analysis of recent conversations
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" nameKey="name" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
