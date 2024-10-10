import { useState, useEffect, useCallback } from 'react'

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

export function useSSEData<T>({ url, initialData }: SSEOptions<T>): SSEHookResult<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState<boolean>(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'error'>(
    'reconnecting'
  )
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const setupEventSource = useCallback(() => {
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data) as T
        setData(newData)
        setLastUpdated(new Date())
        setLoading(false)
        setConnectionStatus('connected')
      } catch (error) {
        setConnectionStatus('error')
      }
    }

    eventSource.onerror = () => {
      setConnectionStatus('error')
      eventSource.close()
    }

    return eventSource
  }, [url])

  useEffect(() => {
    let eventSource: EventSource | null = null
    const retryTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      if (eventSource) {
        eventSource.close()
      }
      setConnectionStatus('reconnecting')
      eventSource = setupEventSource()
    }

    connect()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
    }
  }, [setupEventSource])

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null

    if (connectionStatus === 'error') {
      retryTimeout = setTimeout(() => {
        setConnectionStatus('reconnecting')
      }, 5000) // Retry after 5 seconds
    }

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
    }
  }, [connectionStatus])

  return { data, loading, connectionStatus, lastUpdated }
}
