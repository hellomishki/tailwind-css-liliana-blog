'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'

interface SpotifyData {
  isPlaying: boolean
  name: string
  artist: string
  album: string
  albumArt: string
  spotifyUrl: string
  lastPlayedAt?: string
}

const formatLastPlayedDate = (timestamp: string): string => {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
}

const SpotifyStatusWidget: React.FC = () => {
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null

    const setupEventSource = () => {
      eventSource = new EventSource('/api/spotify-status?sse=true')

      eventSource.onmessage = (event) => {
        console.log('Received SSE update:', event.data)
        try {
          const data = JSON.parse(event.data)
          if (data.error) {
            setError(data.error)
            console.error('Error in SSE update:', data)
          } else {
            setSpotifyData(data)
            setLastUpdated(new Date())
            setLoading(false)
            setError(null)
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
          setError(`Error parsing server data: ${event.data}`)
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        setError('Error in real-time updates. Reconnecting...')
        eventSource?.close()
        setTimeout(setupEventSource, 5000) // Try to reconnect after 5 seconds
      }
    }

    setupEventSource()

    return () => {
      eventSource?.close()
    }
  }, [])

  useEffect(() => {
    // Update "time since last update" every minute
    const intervalId = setInterval(() => {
      setLastUpdated((prevLastUpdated) => (prevLastUpdated ? new Date(prevLastUpdated) : null))
    }, 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  if (loading)
    return (
      <div className="animate-pulse rounded-lg bg-gray-200 p-4 dark:bg-gray-700">Loading...</div>
    )

  if (error) return <div className="rounded-lg bg-red-100 p-4 dark:bg-red-900">Error: {error}</div>

  if (!spotifyData) return null

  return (
    <div className="spotify-widget rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
      <h3 className="mb-4 inline-flex text-lg font-semibold">
        <SocialIcon kind="spotify" href={siteMetadata.spotify} />
        <span className="ml-2">Now Playing</span>
      </h3>
      <div className="now-playing flex flex-col">
        <div className="mb-1 flex flex-col items-center">
          <Image
            src={spotifyData.albumArt}
            alt={spotifyData.album}
            width={185}
            height={100}
            className="rounded-md"
          />
        </div>
        <div>
          <a
            href={spotifyData.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-500 hover:underline"
          >
            {spotifyData.name}
          </a>
          <p className="text-sm text-gray-600 dark:text-gray-300">{spotifyData.artist}</p>
          <p className="mt-1 text-xs text-gray-500">{spotifyData.album}</p>
          {!spotifyData.isPlaying && spotifyData.lastPlayedAt && (
            <p className="text-xs text-gray-500">
              Last played: {formatLastPlayedDate(spotifyData.lastPlayedAt)}
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-right text-xs text-gray-500">
        Last updated: {lastUpdated ? formatLastPlayedDate(lastUpdated.toISOString()) : 'N/A'}
      </p>
    </div>
  )
}

export default SpotifyStatusWidget
