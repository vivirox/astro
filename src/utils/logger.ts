const isDev = process.env.NODE_ENV === 'development'

interface LogOptions {
  context?: string
  data?: unknown
}

export const logger = {
  info: (message: string, options: LogOptions = {}) => {
    if (isDev) {
      const { context, data } = options
      console.info(
        `ℹ️ [INFO]${context ? ` [${context}]` : ''}: ${message}`,
        data ?? '',
      )
    }
  },

  debug: (message: string, options: LogOptions = {}) => {
    if (isDev) {
      const { context, data } = options
      console.debug(
        `🔍 [DEBUG]${context ? ` [${context}]` : ''}: ${message}`,
        data ?? '',
      )
    }
  },

  warn: (message: string, options: LogOptions = {}) => {
    const { context, data } = options
    console.warn(
      `⚠️ [WARN]${context ? ` [${context}]` : ''}: ${message}`,
      data ?? '',
    )
  },

  error: (message: string, error?: Error, options: LogOptions = {}) => {
    const { context, data } = options
    console.error(
      `❌ [ERROR]${context ? ` [${context}]` : ''}: ${message}`,
      error ?? '',
      data ?? '',
    )
  },
}
