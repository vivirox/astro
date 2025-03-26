import React, { useState } from 'react'
import {
  FeedbackType,
  useAnonymizedMetrics,
  TherapeuticDomain,
} from '@/simulator'

interface MetricsDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Dialog component to display anonymized metrics from practice sessions
 * Only shows data that has been anonymized and collected with user consent
 */
export function MetricsDialog({ isOpen, onClose }: MetricsDialogProps) {
  const {
    hasMetrics,
    hasConsent,
    getSkillMetrics,
    clearAllMetrics,
    updateConsent,
  } = useAnonymizedMetrics(null)
  const [selectedSkill, setSelectedSkill] = useState<FeedbackType>(
    'empathetic_response',
  )

  // Generate skill metrics for the selected skill
  const metrics = getSkillMetrics(selectedSkill)

  // Toggle consent for metrics collection
  const handleConsentToggle = () => {
    updateConsent(!hasConsent)
  }

  // Clear all collected metrics
  const handleClearMetrics = () => {
    clearAllMetrics()
  }

  // Helper function to render skill metric summary
  const renderSkillMetric = (skill: FeedbackType) => {
    const skillMetrics = getSkillMetrics(skill)
    if (!skillMetrics) return null

    return (
      <div
        key={skill}
        className={`p-3 border rounded-md cursor-pointer transition-colors ${
          selectedSkill === skill
            ? 'bg-blue-50 border-blue-200'
            : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
        onClick={() => setSelectedSkill(skill)}
      >
        <div className="font-medium text-gray-800">
          {skill
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Average score: {skillMetrics.averageScore.toFixed(1)}
          <span
            className={`ml-2 ${
              skillMetrics.improvementTrend > 0
                ? 'text-green-600'
                : skillMetrics.improvementTrend < 0
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {skillMetrics.improvementTrend > 0
              ? `↑ +${skillMetrics.improvementTrend.toFixed(1)}`
              : skillMetrics.improvementTrend < 0
                ? `↓ ${skillMetrics.improvementTrend.toFixed(1)}`
                : ''}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {skillMetrics.dataPoints} data points
        </div>
      </div>
    )
  }

  // If dialog is not open, don't render anything
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Practice Progress Metrics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!hasConsent ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">
                Metrics Collection Disabled
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                You've chosen not to collect anonymized metrics from your
                practice sessions. Enable metrics collection to track your
                progress over time.
              </p>
              <button
                onClick={handleConsentToggle}
                className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md text-sm font-medium"
              >
                Enable Metrics Collection
              </button>
            </div>
          ) : !hasMetrics ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-medium text-blue-800 mb-2">
                No Metrics Available
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                You haven't collected any practice metrics yet. Complete
                practice sessions to generate metrics.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Your Progress Summary
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  These anonymized metrics are only stored in your browser and
                  are never sent to a server.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Generate skill metric summaries */}
                  {(
                    [
                      'empathetic_response',
                      'active_listening',
                      'technique_application',
                      'therapeutic_alliance',
                      'communication_style',
                      'question_formulation',
                    ] as FeedbackType[]
                  )
                    .map((skill) => renderSkillMetric(skill))
                    .filter(Boolean)}
                </div>
              </div>

              {/* Detailed metrics for selected skill */}
              {metrics && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">
                    {selectedSkill
                      .split('_')
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1),
                      )
                      .join(' ')}{' '}
                    Details
                  </h3>

                  <div className="flex items-center mb-4">
                    <div className="w-24 text-right text-sm text-gray-600 mr-3">
                      Average Score:
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${metrics.averageScore}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-right ml-3 text-sm font-medium">
                      {metrics.averageScore.toFixed(1)}
                    </div>
                  </div>

                  <div className="flex items-center mb-4">
                    <div className="w-24 text-right text-sm text-gray-600 mr-3">
                      Improvement:
                    </div>
                    <div className="flex-1 text-sm font-medium">
                      <span
                        className={
                          metrics.improvementTrend > 0
                            ? 'text-green-600'
                            : metrics.improvementTrend < 0
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }
                      >
                        {metrics.improvementTrend > 0
                          ? `+${metrics.improvementTrend.toFixed(1)} points`
                          : metrics.improvementTrend < 0
                            ? `${metrics.improvementTrend.toFixed(1)} points`
                            : 'No change'}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mt-4">
                    Based on {metrics.dataPoints} data points collected from
                    your practice sessions.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center">
          {hasConsent && (
            <button
              onClick={handleClearMetrics}
              className="px-4 py-2 text-sm text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-md"
            >
              Clear All Metrics
            </button>
          )}

          <div className="ml-auto flex items-center space-x-3">
            {hasConsent && (
              <button
                onClick={handleConsentToggle}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Disable Metrics
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
