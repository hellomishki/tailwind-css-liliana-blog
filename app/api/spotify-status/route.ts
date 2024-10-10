import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface SpotifyArtist {
  name: string
}

interface SpotifyTrack {
  name: string
  artists: SpotifyArtist[]
  album: {
    name: string
    images: { url: string }[]
  }
  external_urls: {
    spotify: string
  }
}

interface CurrentlyPlayingResponse {
  is_playing: boolean
  item: SpotifyTrack
}

interface RecentlyPlayedItem {
  track: SpotifyTrack
  played_at: string
}

interface RecentlyPlayedResponse {
  items: RecentlyPlayedItem[]
}

interface CachedSpotifyData {
  isPlaying: boolean
  name: string
  artist: string
  album: string
  albumArt: string
  spotifyUrl: string
  lastPlayedAt?: string
}

let cachedData: CachedSpotifyData | null = null
let lastFetchTime = 0
const CACHE_DURATION = 60 * 1000 // 1 minute in milliseconds

async function refreshAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN as string,
    }),
  })

  const data = await response.json()
  return data.access_token
}

async function fetchSpotifyData(accessToken: string): Promise<CachedSpotifyData> {
  const currentTrackResponse = await fetch(
    'https://api.spotify.com/v1/me/player/currently-playing',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (currentTrackResponse.status === 200) {
    const currentTrack: CurrentlyPlayingResponse = await currentTrackResponse.json()
    const track = currentTrack.item
    return {
      isPlaying: currentTrack.is_playing,
      name: track.name,
      artist: track.artists.map((artist) => artist.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      spotifyUrl: track.external_urls.spotify,
    }
  } else {
    const recentTracksResponse = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=1',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (recentTracksResponse.ok) {
      const recentTracks: RecentlyPlayedResponse = await recentTracksResponse.json()
      if (recentTracks.items.length > 0) {
        const track = recentTracks.items[0].track
        return {
          isPlaying: false,
          name: track.name,
          artist: track.artists.map((artist) => artist.name).join(', '),
          album: track.album.name,
          albumArt: track.album.images[0]?.url,
          spotifyUrl: track.external_urls.spotify,
          lastPlayedAt: recentTracks.items[0].played_at,
        }
      }
    }
    throw new Error('No track data available')
  }
}

async function getSpotifyData(): Promise<CachedSpotifyData> {
  const now = Date.now()
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData
  }

  const accessToken = await refreshAccessToken()
  const freshData = await fetchSpotifyData(accessToken)

  cachedData = freshData
  lastFetchTime = now

  return freshData
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sse = searchParams.get('sse')

  if (sse === 'true') {
    const encoder = new TextEncoder()
    let isActive = true // Flag to control the loop

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial data immediately
        const initialData = await getSpotifyData()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`))

        while (isActive) {
          try {
            // Wait 30 seconds before the next update
            await new Promise((resolve) => setTimeout(resolve, 30000))

            // Send a ping to keep the connection alive
            controller.enqueue(encoder.encode(`data: ping\n\n`))

            // Wait another 30 seconds before fetching new data
            await new Promise((resolve) => setTimeout(resolve, 30000))

            const data = await getSpotifyData()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (error) {
            console.error('Error fetching Spotify data:', error)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: 'Error fetching Spotify data' })}\n\n`
              )
            )
          }
        }
      },
      cancel() {
        isActive = false
        console.log('SSE connection closed')
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } else {
    try {
      const data = await getSpotifyData()
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Error fetching Spotify data:', error)
      return new Response(JSON.stringify({ error: 'Error fetching Spotify data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}
