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

export function useSSEData<T>({ url, initialData }: SSEOptions<T>): SSEHookResult<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState<boolean>(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'error'>(
    'reconnecting'
  )
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setupEventSource = useCallback(() => {
    console.log('Setting up EventSource')
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('EventSource connection opened')
      setConnectionStatus('connected')
    }

    eventSource.onmessage = (event) => {
      console.log('Received SSE message:', event.data)
      try {
        if (event.data === 'ping') {
          console.log('Received ping')
          return
        }
        const newData = JSON.parse(event.data) as T
        setData(newData)
        setLastUpdated(new Date())
        setLoading(false)
        setConnectionStatus('connected')
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      setConnectionStatus('error')
      eventSource.close()
      // Use the reconnect function from the outer scope
      reconnect()
    }

    return eventSource
  }, [url]) // Remove reconnect from dependencies

  const reconnect = useCallback(() => {
    console.log('Attempting to reconnect...')
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionStatus('reconnecting')
      setupEventSource()
    }, 5000)
  }, [setupEventSource]) // Add setupEventSource as a dependency

  useEffect(() => {
    const eventSource = setupEventSource()

    return () => {
      console.log('Cleaning up EventSource')
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
