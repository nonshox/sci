import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { instagramAuthorizationUrl } from '@/lib/instagram';
export const runtime='nodejs';
export async function GET(){
  try{
    const state=randomBytes(32).toString('hex');
    const response=NextResponse.redirect(instagramAuthorizationUrl(state));
    response.cookies.set('sci_instagram_oauth_state',state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/integrations/instagram/callback',maxAge:600});
    return response;
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Instagram setup error'},{status:503});
  }
}
