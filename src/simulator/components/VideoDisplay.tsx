import React, { useEffect, useRef } from 'react'
import type { UserSession } from '../types'

interface VideoDisplayProps {
  isConnected: boolean
  connectionStatus: UserSession['connectionStatus']
  className?: string
}

/**
 * Component for displaying the video feed during simulations
 * This is a privacy-first implementation with no recording capability
 */
const VideoDisplay: React.FC<VideoDisplayProps> = ({
  isConnected,
  connectionStatus,
  className = '',
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // These effects would handle real streams in a full implementation
  // Here they're simulated for demonstration purposes

  // For a real implementation, we would connect these refs to actual MediaStreams
  // from WebRTC, but we avoid doing that in this example to keep it simple

  // Status message based on connection state
  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Establishing connection...'
      case 'connected':
        return 'Connected'
      case 'disconnected':
        return 'Disconnected'
      default:
        return 'Ready to start'
    }
  }

  return (
    <div
      className={`video-display relative rounded-lg overflow-hidden bg-gray-800 ${className}`}
      style={{ aspectRatio: '16/9' }}
    >
      {/* Remote video (would be the simulated patient) */}
      <video
        ref={remoteVideoRef}
        className={`absolute inset-0 w-full h-full object-cover ${isConnected ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        playsInline
        muted // In a real implementation, this would not be muted
      />

      {/* Placeholder for when no connection is active */}
      {!isConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-500 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-300">
            Practice Simulation
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Click Start to begin a therapeutic interaction
          </p>
        </div>
      )}

      {/* Connection status indicator */}
      <div
        className={`absolute bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium flex items-center ${
          connectionStatus === 'connected'
            ? 'bg-green-100 text-green-800'
            : connectionStatus === 'connecting'
              ? 'bg-yellow-100 text-yellow-800 animate-pulse'
              : 'bg-gray-100 text-gray-800'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full mr-1.5 ${
            connectionStatus === 'connected'
              ? 'bg-green-500'
              : connectionStatus === 'connecting'
                ? 'bg-yellow-500'
                : 'bg-gray-500'
          }`}
        />
        {getStatusMessage()}
      </div>

      {/* Local video preview (small picture-in-picture) */}
      <div className="absolute bottom-4 right-4 w-32 h-24 md:w-40 md:h-30 bg-gray-900 rounded overflow-hidden border-2 border-gray-700">
        <video
          ref={localVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
      </div>

      {/* Privacy indicator */}
      <div className="absolute top-4 right-4 bg-blue-900 bg-opacity-70 text-blue-100 text-xs px-2 py-1 rounded-md flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Private Session
      </div>
    </div>
  )
}

export default VideoDisplay
