import React, { useEffect, useState } from 'react'
import { serviceWorkerManager } from '../../utils/serviceWorkerRegistration'
import { toast } from 'react-hot-toast'

interface ServiceWorkerUpdaterProps {
  onUpdateAvailable?: () => void
  onUpdateComplete?: () => void
}

/**
 * ServiceWorkerUpdater Component
 *
 * This component manages service worker registration and updates.
 * It doesn't render anything visible but handles the service worker lifecycle
 * and shows notifications when updates are available.
 */
export const ServiceWorkerUpdater: React.FC<ServiceWorkerUpdaterProps> = ({
  onUpdateAvailable,
  onUpdateComplete,
}) => {
  const [, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!serviceWorkerManager.isSupported()) {
      return
    }

    // Register service worker
    serviceWorkerManager.register().catch((error) => {
      console.error('Service Worker registration failed:', error)
    })

    // Listen for updates
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true)
      onUpdateAvailable?.()

      toast.custom(
        (t) => (
          <div
            className={`
          ${t.visible ? 'animate-enter' : 'animate-leave'}
          max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5
        `}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Update Available
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    A new version is available. Refresh to update.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  window.location.reload()
                  toast.dismiss(t.id)
                  onUpdateComplete?.()
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Refresh
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: 'bottom-right',
        }
      )
    }

    window.addEventListener(
      'serviceWorkerUpdateAvailable',
      handleUpdateAvailable
    )

    // Check for updates periodically
    const checkForUpdates = () => {
      serviceWorkerManager.update().catch((error) => {
        console.error('Service Worker update check failed:', error)
      })
    }

    // Check after component mounts and then periodically
    checkForUpdates()
    const updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000) // Check every hour

    return () => {
      window.removeEventListener(
        'serviceWorkerUpdateAvailable',
        handleUpdateAvailable
      )
      clearInterval(updateInterval)
    }
  }, [onUpdateAvailable, onUpdateComplete])

  // Request notification permission if needed
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            toast.success('Notifications enabled')
          }
        } catch (error) {
          console.error('Failed to request notification permission:', error)
        }
      }
    }

    requestNotificationPermission()
  }, [])

  return null // This is a utility component, it doesn't render anything
}
