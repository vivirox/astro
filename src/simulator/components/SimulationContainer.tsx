import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationContainerProps, TherapeuticTechnique } from '../types';
import { useSimulatorContext } from '../context/SimulatorProvider';
import { checkBrowserCompatibility, anonymizeFeedback } from '../utils/privacy';

/**
 * Main container for the therapeutic simulation
 * Provides real-time interaction with simulated client scenarios
 */
export function SimulationContainer({
  scenarioId,
  className = '',
  onBackToScenarios,
}: SimulationContainerProps) {
  const [userResponse, setUserResponse] = useState<string>('');
  const [isCompatible, setIsCompatible] = useState<boolean>(true);
  const [compatibilityError, setCompatibilityError] = useState<string[]>([]);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [recognitionSupported, setRecognitionSupported] = useState<boolean>(true);
  const [showTechniqueHighlights, setShowTechniqueHighlights] = useState<boolean>(true);
  const [detectedTechniques, setDetectedTechniques] = useState<TherapeuticTechnique[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseInputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const {
    currentScenario,
    isProcessing,
    feedback,
    startSimulation,
    sendResponse,
  } = useSimulatorContext();

  // Conversation history for the current session
  const [conversation, setConversation] = useState<Array<{
    type: 'scenario' | 'user' | 'feedback';
    content: string;
    timestamp: number;
    techniques?: TherapeuticTechnique[];
  }>>([]);

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            setRecognizedText(prev => {
              const newText = prev + ' ' + transcript;
              setUserResponse(newText.trim());
              return newText.trim();
            });
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    } else {
      setRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle toggling speech recognition
  const toggleSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setRecognizedText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Check browser compatibility on mount
  useEffect(() => {
    const { compatible, missingFeatures } = checkBrowserCompatibility();
    setIsCompatible(compatible);
    setCompatibilityError(missingFeatures);
  }, []);

  // Start simulation when scenarioId changes
  useEffect(() => {
    if (scenarioId) {
      // Reset conversation
      setConversation([]);
      setUserResponse('');
      setRecognizedText('');

      // Start new simulation
      startSimulation(scenarioId).then(() => {
        // Focus on response input after simulation starts
        if (responseInputRef.current) {
          responseInputRef.current.focus();
        }
      }).catch(error => {
        console.error('Failed to start simulation:', error);
      });
    }
  }, [scenarioId, startSimulation]);

  // Add scenario information to conversation when scenario changes
  useEffect(() => {
    if (currentScenario) {
      setConversation(prev => {
        // Check if we already have the scenario information
        if (prev.some(item => item.type === 'scenario')) {
          return prev;
        }

        // Add scenario information
        return [{
          type: 'scenario',
          content: `${currentScenario.contextDescription} ${currentScenario.clientBackground}`,
          timestamp: Date.now()
        }];
      });
    }
  }, [currentScenario]);

  // Auto-scroll to bottom of conversation when new messages arrive
  useEffect(() => {
    if (autoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, autoScrollEnabled]);

  // Add feedback to conversation when it arrives
  useEffect(() => {
    if (feedback) {
      setConversation(prev => [
        ...prev,
        {
          type: 'feedback',
          content: feedback.message,
          timestamp: Date.now()
        }
      ]);

      if (feedback.detectedTechniques) {
        setDetectedTechniques(feedback.detectedTechniques);
      }
    }
  }, [feedback]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userResponse.trim() || isProcessing || !currentScenario) {
      return;
    }

    // Add user response to conversation
    setConversation(prev => [
      ...prev,
      {
        type: 'user',
        content: userResponse,
        timestamp: Date.now(),
        techniques: detectedTechniques
      }
    ]);

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Anonymize response for privacy
    const sanitizedResponse = anonymizeFeedback(userResponse);

    // Clear input
    setUserResponse('');
    setRecognizedText('');

    try {
      // Send response to simulator
      await sendResponse(sanitizedResponse);
    } catch (error) {
      console.error('Error sending response:', error);

      // Add error message to conversation
      setConversation(prev => [
        ...prev,
        {
          type: 'feedback',
          content: 'There was an error processing your response. Please try again.',
          timestamp: Date.now()
        }
      ]);
    }
  }, [userResponse, isProcessing, currentScenario, sendResponse, detectedTechniques, isListening]);

  // Handle text area growing as content is added
  const handleTextAreaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserResponse(e.target.value);

    // Adjust height based on content
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }

    // Ctrl+Space to toggle voice recognition
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      if (recognitionSupported) {
        toggleSpeechRecognition();
      }
    }
  }, [handleSubmit, toggleSpeechRecognition, recognitionSupported]);

  // If browser is not compatible, show error message
  if (!isCompatible) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 mb-3">Browser Compatibility Issue</h3>
          <p className="text-red-700 mb-4">
            Your browser doesn't support some features needed for the therapeutic simulator:
          </p>
          <ul className="list-disc text-left max-w-xs mx-auto mb-4 text-red-700">
            {compatibilityError.map((feature, index) => (
              <li key={index} className="ml-4">{feature}</li>
            ))}
          </ul>
          <p className="text-red-700">
            Please try using a modern browser like Chrome, Firefox, or Edge.
          </p>
        </div>
      </div>
    );
  }

  // If no scenario is selected, show empty state or loading
  if (!currentScenario) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto flex flex-col h-full ${className}`}>
      {/* Scenario Information */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-blue-800 mb-1">
              {currentScenario.title}
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              {currentScenario.description}
            </p>
          </div>

          {onBackToScenarios && (
            <button
              onClick={onBackToScenarios}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              aria-label="Change scenario"
            >
              ← Change Scenario
            </button>
          )}
        </div>

        <div className="text-xs text-blue-600">
          <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 mr-2">
            {typeof currentScenario.domain === 'string'
              ? currentScenario.domain.replace(/_/g, ' ')
              : currentScenario.domain}
          </span>
          <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
            {currentScenario.difficulty}
          </span>
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 rounded-lg p-4 max-h-[600px] min-h-[400px] bg-white">
        {conversation.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p>Your simulation will begin shortly.</p>
              <p className="text-sm mt-1">Read the scenario information above and prepare your response.</p>
              <p className="text-xs mt-4 text-blue-500">
                <span className="font-medium">Keyboard shortcuts:</span> <kbd className="bg-gray-100 px-1 rounded">Ctrl+Enter</kbd> to send, <kbd className="bg-gray-100 px-1 rounded">Ctrl+Space</kbd> for voice input
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {conversation.map((item, index) => (
              <div
                key={index}
                className={`${
                  item.type === 'user'
                    ? 'ml-auto bg-blue-100 text-blue-900'
                    : item.type === 'feedback'
                      ? 'mr-auto bg-green-100 text-green-900'
                      : 'mr-auto bg-gray-100 text-gray-900'
                } p-3 rounded-lg max-w-[80%] relative`}
              >
                <div className="text-xs opacity-70 mb-1 flex justify-between">
                  <span>
                    {item.type === 'user'
                      ? 'You'
                      : item.type === 'feedback'
                        ? 'Feedback'
                        : 'Client Background'
                    }
                  </span>
                  <span className="text-xs opacity-50">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {item.content}
                </div>

                {/* Display detected techniques for user responses */}
                {item.type === 'user' && item.techniques && item.techniques.length > 0 && showTechniqueHighlights && (
                  <div className="mt-2 pt-2 border-t border-blue-200 text-xs">
                    <span className="text-blue-700 font-medium">Techniques used: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.techniques.map((technique) => (
                        <span
                          key={technique}
                          className="inline-block bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs"
                        >
                          {technique.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* User Input Area */}
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="relative">
          <textarea
            ref={responseInputRef}
            value={userResponse}
            onChange={handleTextAreaChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Speak now... Voice recognition active" : "Type your therapeutic response here..."}
            className={`w-full p-4 text-gray-700 focus:outline-none resize-none ${isListening ? 'bg-blue-50' : ''}`}
            rows={2}
            disabled={isProcessing}
            aria-label="Your response"
          />

          {recognitionSupported && (
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-3 bottom-3 p-2 rounded-full ${
                isListening
                  ? 'bg-red-100 text-red-600 animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? "Stop listening" : "Start voice input (Ctrl+Space)"}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center bg-gray-50 p-2 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <label className="flex items-center text-xs text-gray-500">
              <input
                type="checkbox"
                checked={autoScrollEnabled}
                onChange={() => setAutoScrollEnabled(!autoScrollEnabled)}
                className="mr-1"
                aria-label="Auto-scroll"
              />
              Auto-scroll
            </label>

            <label className="flex items-center text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showTechniqueHighlights}
                onChange={() => setShowTechniqueHighlights(!showTechniqueHighlights)}
                className="mr-1"
                aria-label="Show technique highlights"
              />
              Show techniques
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              <kbd className="bg-gray-100 px-1 rounded">Ctrl+Enter</kbd> to send
            </span>

            <button
              type="submit"
              disabled={isProcessing || !userResponse.trim()}
              className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                isProcessing || !userResponse.trim()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              aria-label="Send response"
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Send Response'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Objectives and Techniques Section */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2 text-sm">Session Objectives</h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
            {currentScenario.objectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2 text-sm">Recommended Techniques</h4>
          <div className="flex flex-wrap gap-2">
            {currentScenario.techniques.map((technique) => (
              <span
                key={technique}
                className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                title={getTechniqueDescription(technique)}
              >
                {technique.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to provide descriptions of techniques
function getTechniqueDescription(technique: TherapeuticTechnique): string {
  const descriptions: Record<string, string> = {
    active_listening: "Giving full attention to the client and demonstrating attentive listening through verbal and non-verbal cues",
    reflective_statements: "Paraphrasing and reflecting back what the client has said to demonstrate understanding",
    open_ended_questions: "Questions that cannot be answered with a simple 'yes' or 'no', encouraging elaboration",
    validation: "Acknowledging and accepting the client's emotions and experiences as valid and understandable",
    motivational_interviewing: "Collaborative conversation style for strengthening a person's motivation and commitment to change",
    cognitive_restructuring: "Identifying and challenging negative or distorted thinking patterns",
    goal_setting: "Collaborative development of specific, measurable, achievable, relevant, and time-bound goals",
    mindfulness: "Guiding awareness to the present moment with acceptance and without judgment",
    behavioral_activation: "Encouraging engagement in rewarding activities to improve mood and build positive experiences",
    grounding_techniques: "Methods to help bring a person back to the present moment during distress or flashbacks"
  };

  return descriptions[technique] || technique.replace(/_/g, ' ');
}
