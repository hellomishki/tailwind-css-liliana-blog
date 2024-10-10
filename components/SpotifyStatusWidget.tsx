'use client'

import React from 'react'
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
    lastUpdated,
  } = useSSEData<SpotifyData>({
    url: '/api/spotify-status?sse=true',
    initialData: null,
  })

  const renderContent = (data: SpotifyData | null, isLoading: boolean) => (
    <div className={`now-playing flex flex-col ${isLoading ? 'opacity-50' : ''}`}>
      <div className="mb-1 flex flex-col items-center">
        {data?.albumArt && (
          <Image
            src={data.albumArt}
            alt={data.album}
            width={185}
            height={100}
            className="rounded-md"
          />
        )}
      </div>
      <div>
        {data?.name && (
          <a
            href={data.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-500 hover:underline"
          >
            {data.name}
          </a>
        )}
        {data?.artist && <p className="text-sm text-gray-600 dark:text-gray-300">{data.artist}</p>}
        {data?.album && <p className="mt-1 text-xs text-gray-500">{data.album}</p>}
        {!data?.isPlaying && data?.lastPlayedAt && (
          <p className="text-xs text-gray-500">
            Last played: {formatLastPlayedDate(data.lastPlayedAt)}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="spotify-widget rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
      <h3 className="mb-4 inline-flex text-lg font-semibold">
        <SocialIcon kind="spotify" href={siteMetadata.spotify} />
        <span className="ml-2">Now Playing</span>
      </h3>
      {renderContent(spotifyData, loading)}
      {lastUpdated && (
        <p className="mt-4 text-right text-xs text-gray-500">
          Last updated: {formatLastPlayedDate(lastUpdated.toISOString())}
        </p>
      )}
    </div>
  )
}

export default SpotifyStatusWidget
