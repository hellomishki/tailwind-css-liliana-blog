import { useState, useEffect } from 'react'

interface SSEOptions<T> {
  url: string
  initialData: T | null
}

interface SSEHookResult<T> {
  data: T | null
  loading: boolean
  connectionStatus: 'connected' | 'reconnecting'
  lastUpdated: Date | null
}

export function useSSEData<T>({ url, initialData }: SSEOptions<T>): SSEHookResult<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState<boolean>(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting'>(
    'connected'
  )
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null

    const setupEventSource = () => {
      setConnectionStatus('reconnecting')
      eventSource = new EventSource(url)

      eventSource.onmessage = (event) => {
        console.log('Received SSE update:', event.data)
        try {
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
        setConnectionStatus('reconnecting')
        eventSource?.close()
        setTimeout(setupEventSource, 5000) // Try to reconnect after 5 seconds
      }
    }

    setupEventSource()

    return () => {
      eventSource?.close()
    }
  }, [url])

  return { data, loading, connectionStatus, lastUpdated }
}
