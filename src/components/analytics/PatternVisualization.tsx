import type {
  CrossSessionPattern,
  RiskCorrelation,
  TrendPattern,
} from '@/lib/ai/services/PatternRecognitionService'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface PatternVisualizationProps {
  trends: TrendPattern[]
  crossSessionPatterns: CrossSessionPattern[]
  riskCorrelations: RiskCorrelation[]
  isLoading?: boolean
  onPatternSelect?: (
    pattern: TrendPattern | CrossSessionPattern | RiskCorrelation,
  ) => void
}

export function PatternVisualization({
  trends,
  crossSessionPatterns,
  riskCorrelations,
  isLoading,
  onPatternSelect,
}: PatternVisualizationProps) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="trends" className="w-full">
      <TabsList>
        <TabsTrigger value="trends">Long-term Trends</TabsTrigger>
        <TabsTrigger value="patterns">Session Patterns</TabsTrigger>
        <TabsTrigger value="risks">Risk Correlations</TabsTrigger>
      </TabsList>

      <TabsContent value="trends">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Emotional Trends Over Time
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={transformTrendsData(trends)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="significance"
                stroke="#8884d8"
                activeDot={{
                  r: 8,
                  onClick: (_, payload) =>
                    onPatternSelect?.(payload.payload.original),
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </TabsContent>

      <TabsContent value="patterns">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Cross-Session Pattern Distribution
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={transformPatternData(crossSessionPatterns)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="pattern" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="frequency"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.3}
                onClick={(_, payload) =>
                  onPatternSelect?.(payload.payload.original)
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </TabsContent>

      <TabsContent value="risks">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Risk Factor Correlations
          </h3>
          <div className="space-y-4">
            {riskCorrelations.map((correlation, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border cursor-pointer hover:bg-gray-50"
                onClick={() => onPatternSelect?.(correlation)}
              >
                <h4 className="font-medium text-primary">
                  {correlation.primaryFactor}
                  <span
                    className={`ml-2 px-2 py-1 rounded text-sm ${getSeverityColor(correlation.severity)}`}
                  >
                    {correlation.severity}
                  </span>
                </h4>
                <div className="mt-2 space-y-2">
                  {correlation.correlatedFactors.map((factor, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{factor.factor}</span>
                      <span className="font-mono">
                        {(factor.correlation * 100).toFixed(1)}% (
                        {factor.confidence.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
                {correlation.actionRequired && (
                  <div className="mt-2 text-red-600 text-sm font-medium">
                    ⚠️ Immediate action recommended
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function transformTrendsData(trends: TrendPattern[]) {
  return trends.map((trend) => ({
    date: trend.startTime.toLocaleDateString(),
    significance: trend.significance,
    confidence: trend.confidence,
    original: trend,
  }))
}

function transformPatternData(patterns: CrossSessionPattern[]) {
  return patterns.map((pattern) => ({
    pattern: pattern.type,
    frequency: pattern.frequency,
    confidence: pattern.confidence,
    original: pattern,
  }))
}

function getSeverityColor(severity: 'low' | 'medium' | 'high') {
  switch (severity) {
    case 'low':
      return 'bg-green-100 text-green-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'high':
      return 'bg-red-100 text-red-800'
  }
}
