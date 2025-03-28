import { Button } from '@/components/ui/button'
import type { MentalHealthAnalysis } from '@/lib/chat'

interface MentalHealthInsightsProps {
  analysis: MentalHealthAnalysis
  onRequestIntervention?: () => void
  showCharts?: boolean
}

export function MentalHealthInsights({
  analysis,
  onRequestIntervention,
  showCharts = true,
}: MentalHealthInsightsProps) {
  const isPotentialRisk = analysis.riskLevel !== 'low'

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="text-sm font-medium mb-2">Summary</h4>
        <p className="text-xs text-muted-foreground">{analysis.summary}</p>
      </div>

      {/* Score Chart */}
      {showCharts && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Mental Health Indicators</h4>
          <div className="space-y-2">
            {Object.entries(analysis.scores)
              .filter(([_key, value]) => value !== undefined)
              .sort(([_keyA, a], [_keyB, b]) => {
                const valueA = a ?? 0
                const valueB = b ?? 0
                return valueB - valueA
              })
              .map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-xs font-medium">
                      {Math.round((value || 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${Math.round((value || 0) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Expert Explanation */}
      {analysis.expertExplanation && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 dark:bg-blue-950 dark:border-blue-900">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Expert Explanation
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            {analysis.expertExplanation}
          </p>
        </div>
      )}

      {/* Request Intervention */}
      {isPotentialRisk && onRequestIntervention && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onRequestIntervention} variant="outline">
            Request Therapeutic Response
          </Button>
        </div>
      )}
    </div>
  )
}

interface MentalHealthHistoryChartProps {
  analysisHistory: MentalHealthAnalysis[]
}

export function MentalHealthHistoryChart({
  analysisHistory,
}: MentalHealthHistoryChartProps) {
  if (analysisHistory.length === 0) {
    return null
  }

  // Get all unique categories across all analyses
  const categories = Array.from(
    new Set(
      analysisHistory.flatMap((analysis) => Object.keys(analysis.scores)),
    ),
  )

  return (
    <div className="p-4 bg-muted rounded-lg">
      <h4 className="text-sm font-medium mb-4">Trend Analysis</h4>
      <div className="space-y-2 mb-4">
        {/* Show latest values */}
        {categories.map((category) => (
          <div key={category} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs capitalize">
                {category.replace(/([A-Z])/g, ' $1')}
              </span>
              <span className="text-xs font-medium">
                {Math.round(
                  (analysisHistory[analysisHistory.length - 1].scores[
                    category
                  ] || 0) * 100,
                )}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
              <div
                className="bg-green-600 h-1.5 rounded-full"
                style={{
                  width: `${Math.round((analysisHistory[analysisHistory.length - 1].scores[category] || 0) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-center text-muted-foreground">
        {analysisHistory.length} data points collected
      </div>
    </div>
  )
}
