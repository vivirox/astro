import { useState, useCallback } from "react";
import type { SentimentAnalysisResult } from "../../../lib/ai";

interface UseSentimentAnalysisOptions {
  apiEndpoint?: string;
  model?: string;
  onError?: (error: Error) => void;
  onComplete?: (result: SentimentAnalysisResult) => void;
}

interface UseSentimentAnalysisResult {
  result: SentimentAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  analyzeText: (text: string) => Promise<SentimentAnalysisResult | null>;
  analyzeBatch: (texts: string[]) => Promise<SentimentAnalysisResult[] | null>;
  reset: () => void;
}

/**
 * Custom hook for sentiment analysis
 */
export function useSentimentAnalysis({
  apiEndpoint = "/api/ai/sentiment",
  model = "gpt-4o",
  onError,
  onComplete,
}: UseSentimentAnalysisOptions = {}): UseSentimentAnalysisResult {
  const [result, setResult] = useState<SentimentAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state
  const reset = useCallback(() => {
    setResult(null);
    setIsLoading(false);
    setError(null);
  }, []);

  // Analyze a single text
  const analyzeText = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return null;

      setIsLoading(true);
      setError(null);

      try {
        // Prepare request body
        const requestBody = {
          text,
          model,
        };

        // Send request to API
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to analyze sentiment");
        }

        // Parse response
        const data = (await response.json()) as SentimentAnalysisResult;
        setResult(data);

        // Call onComplete callback
        if (onComplete) {
          onComplete(data);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);

        // Call onError callback
        if (onError && err instanceof Error) {
          onError(err);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, model, apiEndpoint, onError, onComplete],
  );

  // Analyze a batch of texts
  const analyzeBatch = useCallback(
    async (texts: string[]) => {
      if (texts.length === 0 || isLoading) return null;

      setIsLoading(true);
      setError(null);

      try {
        // Prepare request body
        const requestBody = {
          batch: texts,
          model,
        };

        // Send request to API
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to analyze sentiment batch",
          );
        }

        // Parse response
        const data = (await response.json()) as SentimentAnalysisResult[];

        // We don't set result for batch analysis since it's multiple results
        // But we can call onComplete with the first result if needed
        if (onComplete && data.length > 0) {
          onComplete(data[0]);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);

        // Call onError callback
        if (onError && err instanceof Error) {
          onError(err);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, model, apiEndpoint, onError, onComplete],
  );

  return {
    result,
    isLoading,
    error,
    analyzeText,
    analyzeBatch,
    reset,
  };
}
