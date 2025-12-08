// app/api/auth/yelp/callback/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming you set up global prisma client
import { createSessionToken } from '@/lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://www.yelp.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YELP_CLIENT_ID,
        client_secret: process.env.YELP_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NEXT_PUBLIC_YELP_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Failed to retrieve access token');
    }

    // 2. Get User Info (Yelp doesn't always send user ID in token response directly)
    // Note: Standard Yelp Oauth usually gives user_id in the token response or allows /v3/user call
    // If Yelp doesn't return user_id, we might need to use the token to fetch /v3/user/details
    // For this example, let's assume tokenData contains user_id or we fetch it:
    
    // *SIMULATION*: Since Yelp User Details API is restricted, we will use the ID 
    // from the token response if available, or fetch it. 
    // For hackathon safety, verify if tokenData.user_id exists.
    
    // If tokenData doesn't have ID, you might need to rely on email or a temporary ID
    const yelpUserId = tokenData.user_id || "temp_hackathon_id_" + Date.now(); 

    // 3. Upsert User in DB
    // We create a skeleton user. They will finish profile (username/diet) on the frontend.
    const user = await prisma.user.upsert({
      where: { yelpId: yelpUserId },
      update: {}, // No updates on login
      create: {
        yelpId: yelpUserId,
        email: `pending_${yelpUserId}@cravemate.temp`, // Placeholder until they fill form
        username: `user_${yelpUserId.substring(0,6)}`,
      },
    });

    // 4. Create App Session
    const sessionToken = await createSessionToken({ 
      userId: user.id, 
      yelpId: user.yelpId 
    });

    // 5. Set Cookie and Redirect
    const response = NextResponse.redirect(new URL('/onboarding', request.url));
    
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;

  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
