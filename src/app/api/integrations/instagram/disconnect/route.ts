import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ disconnected: true });
  response.cookies.set('sci_instagram_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
