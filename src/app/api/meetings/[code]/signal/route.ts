import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { from, to, type, payload } = body;

    if (!from || !type) {
      return NextResponse.json({ error: 'Missing signal parameters' }, { status: 400 });
    }

    if (!inMemoryStore.signals.has(code)) {
      inMemoryStore.signals.set(code, []);
    }

    const queue = inMemoryStore.signals.get(code)!;
    queue.push({
      from,
      to: to || 'all',
      type,
      payload,
      timestamp: Date.now(),
    });

    // Prune signals older than 30 seconds
    const cutoff = Date.now() - 30000;
    const filtered = queue.filter((item) => item.timestamp > cutoff);
    inMemoryStore.signals.set(code, filtered);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(req.url);
    const peerId = searchParams.get('peerId');
    const since = parseInt(searchParams.get('since') || '0', 10);

    const queue = inMemoryStore.signals.get(code) || [];
    const messages = queue.filter(
      (item) => item.timestamp > since && item.from !== peerId && (item.to === 'all' || item.to === peerId)
    );

    return NextResponse.json({ signals: messages, serverTime: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
