import { useCallback, useEffect, useState } from 'react';
import {
  AnonymizedMetrics,
  TherapeuticTechnique,
  TherapeuticDomain,
  FeedbackType
} from '../types';
import { getUserConsentPreference } from '../utils/privacy';

// Local storage key for metrics
const METRICS_STORAGE_KEY = 'simulator_anonymized_metrics';

// Initial state for metrics
const initialMetrics: AnonymizedMetrics = {
  techniquesUsed: Object.values(TherapeuticTechnique).reduce((acc, technique) => {
    acc[technique] = 0;
    return acc;
  }, {} as Record<TherapeuticTechnique, number>),

  domainsExplored: Object.values(TherapeuticDomain).reduce((acc, domain) => {
    acc[domain] = 0;
    return acc;
  }, {} as Record<TherapeuticDomain, number>),

  feedbackReceived: Object.values(FeedbackType).reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<FeedbackType, number>),

  skillProgress: Object.values(TherapeuticTechnique).reduce((acc, technique) => {
    acc[technique] = 0;
    return acc;
  }, {} as Record<TherapeuticTechnique, number>),

  sessionsCompleted: 0
};

// Types for metric update actions
type MetricUpdateAction =
  | { type: 'startSession'; domain: TherapeuticDomain | string }
  | { type: 'recordTechniques'; techniques: TherapeuticTechnique[] }
  | { type: 'recordFeedback'; feedbackType: FeedbackType }
  | { type: 'clearMetrics' };

/**
 * Custom hook for managing anonymized metrics with privacy controls
 * All data is stored locally in the browser with user consent
 */
export function useAnonymizedMetrics() {
  const [metrics, setMetrics] = useState<AnonymizedMetrics>(initialMetrics);
  const [hasConsent, setHasConsent] = useState<boolean>(getUserConsentPreference());

  // Load metrics from localStorage on mount if consent is given
  useEffect(() => {
    const consentStatus = getUserConsentPreference();
    setHasConsent(consentStatus);

    if (consentStatus) {
      try {
        const storedMetrics = localStorage.getItem(METRICS_STORAGE_KEY);
        if (storedMetrics) {
          setMetrics(JSON.parse(storedMetrics));
        }
      } catch (error) {
        console.error('Failed to load metrics from localStorage:', error);
        // If there's an error loading, reset to initial state
        setMetrics(initialMetrics);
      }
    }
  }, []);

  // Save metrics to localStorage whenever they change
  useEffect(() => {
    if (hasConsent) {
      try {
        localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
      } catch (error) {
        console.error('Failed to save metrics to localStorage:', error);
      }
    }
  }, [metrics, hasConsent]);

  // Update metrics based on action
  const updateMetrics = useCallback((action: MetricUpdateAction) => {
    if (!hasConsent && action.type !== 'clearMetrics') {
      // Don't update metrics without consent
      return;
    }

    setMetrics(current => {
      const updated = { ...current };

      switch (action.type) {
        case 'startSession':
          // Increment session count
          updated.sessionsCompleted += 1;
          updated.lastSessionDate = Date.now();

          // Increment domain count if it's a valid domain
          if (Object.values(TherapeuticDomain).includes(action.domain as TherapeuticDomain)) {
            updated.domainsExplored[action.domain as TherapeuticDomain] += 1;
          }
          break;

        case 'recordTechniques':
          // Increment technique usage counts
          action.techniques.forEach(technique => {
            updated.techniquesUsed[technique] += 1;

            // Update skill progress (simple implementation)
            // In a real system, this would use more sophisticated skill progression metrics
            const currentProgress = updated.skillProgress[technique];
            const maxProgress = 100; // Max skill level
            const incrementAmount = 5; // Progress per usage

            updated.skillProgress[technique] = Math.min(
              maxProgress,
              currentProgress + incrementAmount
            );
          });
          break;

        case 'recordFeedback':
          // Increment feedback type count
          updated.feedbackReceived[action.feedbackType] += 1;
          break;

        case 'clearMetrics':
          // Reset all metrics
          return { ...initialMetrics };

        default:
          return current;
      }

      return updated;
    });
  }, [hasConsent]);

  // Clear all stored metrics
  const clearMetrics = useCallback(() => {
    updateMetrics({ type: 'clearMetrics' });
  }, [updateMetrics]);

  return {
    metrics,
    updateMetrics,
    clearMetrics,
    hasConsent
  };
}
