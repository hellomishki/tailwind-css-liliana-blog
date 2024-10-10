import { useState, useEffect, useCallback, useRef } from 'react'

interface SSEOptions<T> {
  url: string
  initialData: T | null
}

interface SSEHookResult<T> {
  data: T | null
  loading: boolean
  connectionStatus: 'connected' | 'reconnecting' | 'error'
  lastUpdated: Date | null
}

// Helper function for logging
const log = (message: string, data?: unknown) => {
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify({ message, data }))
  } else {
    console.log(message, data)
  }
}

export function useSSEData<T>({ url, initialData }: SSEOptions<T>): SSEHookResult<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState<boolean>(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'error'>(
    'reconnecting'
  )
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const reconnect = useCallback(() => {
    log('Attempting to reconnect...')
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionStatus('reconnecting')
      setupEventSource()
    }, 5000)
  }, []) // Empty dependency array as it doesn't use any external variables

  const setupEventSource = useCallback(() => {
    log('Setting up EventSource')
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      log('EventSource connection opened')
      setConnectionStatus('connected')
    }

    eventSource.onmessage = (event) => {
      try {
        if (event.data === 'ping') {
          // Silently handle ping messages
          return
        }
        const newData = JSON.parse(event.data) as T
        setData(newData)
        setLastUpdated(new Date())
        setLoading(false)
        setConnectionStatus('connected')
      } catch (error) {
        log('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      log('EventSource error:', error)
      setConnectionStatus('error')
      eventSource.close()
      reconnect()
    }

    return eventSource
  }, [url, reconnect])

  useEffect(() => {
    const eventSource = setupEventSource()

    return () => {
      log('Cleaning up EventSource')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [setupEventSource])

  return { data, loading, connectionStatus, lastUpdated }
}
