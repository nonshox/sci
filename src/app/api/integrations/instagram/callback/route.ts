import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { encryptSecret } from '@/lib/crypto';
import { exchangeCode } from '@/lib/instagram';
export const runtime='nodejs';
export async function GET(req:NextRequest){
  const url=new URL(req.url);
  const response=NextResponse.redirect(new URL('/',url.origin));
  response.cookies.set('sci_instagram_oauth_state','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/integrations/instagram/callback',maxAge:0});
  const error=url.searchParams.get('error_description')||url.searchParams.get('error');
  if(error){
    response.headers.set('location',new URL(`/?instagram_error=${encodeURIComponent(error)}`,url.origin).toString());
    return response;
  }
  const code=url.searchParams.get('code');
  const state=url.searchParams.get('state');
  const savedState=req.cookies.get('sci_instagram_oauth_state')?.value;
  if(!code||!state)return NextResponse.json({error:'Missing OAuth code or state.'},{status:400});
  if(!savedState||state!==savedState)return NextResponse.json({error:'Invalid or expired OAuth state. Start Instagram login again.'},{status:400});
  try{
    const token=await exchangeCode(code);
    response.cookies.set('sci_instagram_token',encryptSecret(token.access_token),{
      httpOnly:true,
      secure:process.env.NODE_ENV==='production',
      sameSite:'lax',
      path:'/',
      maxAge:Math.min(token.expires_in,60*24*60*60),
    });
    response.headers.set('location',new URL('/?instagram=connected',url.origin).toString());
    return response;
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Instagram authorization failed'},{status:502});
  }
}
