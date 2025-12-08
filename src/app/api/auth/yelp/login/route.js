// app/api/auth/yelp/login/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  const scope = 'openid'; // We just need identity for now
  const state = crypto.randomUUID(); // Good practice for security
  
  const params = new URLSearchParams({
    client_id: process.env.YELP_CLIENT_ID,
    redirect_uri: process.env.NEXT_PUBLIC_YELP_REDIRECT_URI,
    response_type: 'code',
    scope: scope,
    state: state,
  });

  const yelpUrl = `https://www.yelp.com/oauth2/authorize?${params.toString()}`;
  
  return NextResponse.redirect(yelpUrl);
}
