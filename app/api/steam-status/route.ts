import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface GameDetails {
  header_image?: string
  // Add other properties that might be returned by the Steam API
}

interface GameInfo {
  name: string
  appid: string | number
  header_image?: string
  steam_store_link: string
  playtime_2weeks?: number
  playtime_forever?: number
  last_play_time?: number
}

async function fetchGameDetails(appId: string): Promise<GameDetails | null> {
  const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`)
  const data = await response.json()
  return data[appId].success ? data[appId].data : null
}

async function fetchSteamData() {
  const STEAM_API_KEY = process.env.STEAM_API_KEY
  const STEAM_ID = process.env.STEAM_ID

  if (!STEAM_API_KEY || !STEAM_ID) {
    throw new Error('Steam API key or Steam ID not configured')
  }

  // Fetch player summary
  const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${STEAM_ID}`
  const summaryResponse = await fetch(summaryUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
    cache: 'no-store',
  })

  if (!summaryResponse.ok) {
    throw new Error(`Steam API responded with status: ${summaryResponse.status}`)
  }

  const summaryData = await summaryResponse.json()

  if (
    !summaryData.response ||
    !summaryData.response.players ||
    summaryData.response.players.length === 0
  ) {
    throw new Error('No player data found in the API response')
  }

  const playerData = summaryData.response.players[0]

  // Fetch owned games
  const ownedGamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=1&include_played_free_games=1`
  const ownedGamesResponse = await fetch(ownedGamesUrl, { cache: 'no-store' })

  if (!ownedGamesResponse.ok) {
    throw new Error(`Steam API responded with status: ${ownedGamesResponse.status}`)
  }

  const ownedGamesData = await ownedGamesResponse.json()
  const ownedGames = ownedGamesData.response.games || []
  ownedGames.sort((a, b) => b.rtime_last_played - a.rtime_last_played)

  const mostRecentGame = ownedGames.length > 0 ? ownedGames[0] : null

  let currentGameDetails: GameDetails | null = null
  let recentGameDetails: GameDetails | null = null

  if (playerData.gameextrainfo && playerData.gameid) {
    currentGameDetails = await fetchGameDetails(playerData.gameid)
  }

  if (
    mostRecentGame &&
    (!playerData.gameextrainfo || mostRecentGame.appid.toString() !== playerData.gameid)
  ) {
    recentGameDetails = await fetchGameDetails(mostRecentGame.appid.toString())
  }

  const result = {
    personaname: playerData.personaname,
    avatarfull: playerData.avatarfull,
    personastate: playerData.personastate,
    lastlogoff: playerData.lastlogoff,
    currentGame: playerData.gameextrainfo
      ? {
          name: playerData.gameextrainfo,
          appid: playerData.gameid,
          header_image: currentGameDetails?.header_image,
          steam_store_link: `https://store.steampowered.com/app/${playerData.gameid}`,
        }
      : null,
    recentGame:
      mostRecentGame &&
      (!playerData.gameextrainfo || mostRecentGame.appid.toString() !== playerData.gameid)
        ? {
            name: mostRecentGame.name,
            appid: mostRecentGame.appid,
            playtime_2weeks: mostRecentGame.playtime_2weeks,
            playtime_forever: mostRecentGame.playtime_forever,
            last_play_time: mostRecentGame.rtime_last_played,
            header_image: recentGameDetails?.header_image,
            steam_store_link: `https://store.steampowered.com/app/${mostRecentGame.appid}`,
          }
        : null,
  }

  // console.log('Fetched Steam data:', JSON.stringify(result))
  return result
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sse = searchParams.get('sse')

  if (sse === 'true') {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            const data = await fetchSteamData()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (error) {
            console.error('Error fetching Steam data:', error)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Error fetching Steam data' })}\n\n`)
            )
          }
          await new Promise((resolve) => setTimeout(resolve, 30000)) // Update every 30 seconds
        }
      },
      cancel() {
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
      const data = await fetchSteamData()
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Error fetching Steam data:', error)
      return new Response(JSON.stringify({ error: 'Error fetching Steam data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}
