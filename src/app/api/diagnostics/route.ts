import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(`[CLIENT-DIAGNOSTIC] [${body.tag || 'INFO'}]`, JSON.stringify(body.data || body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
