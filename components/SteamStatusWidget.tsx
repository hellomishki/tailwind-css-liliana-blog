'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'

interface GameInfo {
  name: string
  appid: string | number
  header_image?: string
  steam_store_link?: string
  last_play_time?: number
}

interface SteamData {
  personaname: string
  avatarfull: string
  personastate: number
  lastlogoff: number
  currentGame: GameInfo | null
  recentGame: GameInfo | null
}

const personaStates = [
  'Offline',
  'Online',
  'Busy',
  'Away',
  'Snooze',
  'Looking to trade',
  'Looking to play',
]

const StatusIndicator: React.FC<{ state: number }> = ({ state }) => {
  let color = 'bg-gray-500'
  switch (state) {
    case 1:
      color = 'bg-green-500'
      break
    case 2:
      color = 'bg-red-500'
      break
    case 3:
      color = 'bg-blue-500'
      break
    case 4:
      color = 'bg-yellow-500'
      break
  }
  return (
    <div className={`status-indicator h-4 w-4 ${color} rounded-full border-2 border-white`}>
      <div className={`absolute ${color} animate-ping rounded-full opacity-75`}></div>
    </div>
  )
}

const formatLastPlayedDate = (timestamp: number): string => {
  const now = new Date()
  const date = new Date(timestamp * 1000)
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

const SteamStatusWidget: React.FC = () => {
  const [steamData, setSteamData] = useState<SteamData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null

    const setupEventSource = () => {
      eventSource = new EventSource('/api/steam-status?sse=true')

      eventSource.onmessage = (event) => {
        console.log('Received SSE update:', event.data)
        const data = JSON.parse(event.data)
        setSteamData(data)
        setLastUpdated(new Date())
        setLoading(false)
        setError(null)
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

  if (!steamData) return null

  const renderGameInfo = (game: GameInfo | null, isCurrent: boolean) => {
    if (!game) return null
    return (
      <div className="game-info">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {isCurrent ? 'Currently playing:' : 'Last played:'}
        </p>
        <a
          href={game.steam_store_link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block transition-opacity hover:opacity-80"
        >
          <Image
            src={game.header_image || '/placeholder-game.jpg'}
            alt={game.name}
            width={350}
            height={300}
            className="rounded-md"
          />
          <p className="mt-1 text-sm font-medium text-primary-500 hover:underline">{game.name}</p>
        </a>
        {!isCurrent && game.last_play_time && (
          <p className="mt-1 text-xs text-gray-500">{formatLastPlayedDate(game.last_play_time)}</p>
        )}
      </div>
    )
  }

  return (
    <div className="steam-widget rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
      <h3 className="mb-4 inline-flex text-lg font-semibold">
        <SocialIcon kind="steam" href={siteMetadata.steam} />
        <span className="ml-2">Status</span>
      </h3>
      <div className="flex items-start">
        <div className="relative mr-5">
          <p className="mb-1 text-center font-medium">{steamData.personaname}</p>
          <Image
            src={steamData.avatarfull}
            alt={steamData.personaname}
            width={64}
            height={64}
            className="mb-1 rounded-full"
          />
          <StatusIndicator state={steamData.personastate} />
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            {personaStates[steamData.personastate]}
          </p>
        </div>
        <div>
          {renderGameInfo(steamData.currentGame, true)}
          {!steamData.currentGame && renderGameInfo(steamData.recentGame, false)}
        </div>
      </div>
      <p className="mt-4 text-right text-xs text-gray-500">
        Last updated: {lastUpdated ? formatLastPlayedDate(lastUpdated.getTime() / 1000) : 'N/A'}
      </p>
    </div>
  )
}

export default SteamStatusWidget
