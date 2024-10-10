import { NextResponse } from 'next/server'

const scopes = ['user-read-currently-playing', 'user-read-recently-played']
const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID as string,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
  })

  const authorizeURL = `https://accounts.spotify.com/authorize?${params.toString()}`
  return NextResponse.redirect(authorizeURL)
}