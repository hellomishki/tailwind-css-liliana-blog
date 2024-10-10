'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'
import { useSSEData } from '../hooks/useSSEData'

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
  const {
    data: spotifyData,
    loading,
    connectionStatus,
    lastUpdated,
  } = useSSEData<SpotifyData>({
    url: '/api/spotify-status?sse=true',
    initialData: null,
  })

  useEffect(() => {
    console.log('Spotify widget updated:', { spotifyData, loading, connectionStatus, lastUpdated })
  }, [spotifyData, loading, connectionStatus, lastUpdated])

  if (loading && !spotifyData) {
    return (
      <div className="animate-pulse rounded-lg bg-gray-200 p-4 dark:bg-gray-700">Loading...</div>
    )
  }

  if (!spotifyData) {
    return (
      <div className="rounded-lg bg-red-100 p-4 dark:bg-red-900">
        Unable to load Spotify data. Please try again later.
      </div>
    )
  }

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
      {lastUpdated && (
        <p className="mt-4 text-right text-xs text-gray-500">
          Last updated: {formatLastPlayedDate(lastUpdated.toISOString())}
        </p>
      )}
    </div>
  )
}

export default SpotifyStatusWidget
