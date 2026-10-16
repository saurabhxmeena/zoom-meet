import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/store';
import { connectDB } from '@/lib/db';
import { SignalModel } from '@/lib/models/Signal';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { from, to, type, payload } = body;
    const resolvedFrom = from || body.senderSessionId || body.userId || 'anon_' + Math.random().toString(36).substring(2, 8);

    if (!type) {
      return NextResponse.json({ error: 'Missing signal type' }, { status: 400 });
    }

    const timestamp = Date.now();
    const toTarget = to || 'all';

    // 1. In-memory store update (for local dev fallback)
    if (!inMemoryStore.signals.has(code)) {
      inMemoryStore.signals.set(code, []);
    }
    const queue = inMemoryStore.signals.get(code)!;
    queue.push({
      from: resolvedFrom,
      to: toTarget,
      type,
      payload,
      timestamp,
    });
    // Keep last 2 minutes (120s) of signaling messages
    const cutoff = timestamp - 120000;
    const filtered = queue.filter((item) => item.timestamp > cutoff);
    inMemoryStore.signals.set(code, filtered);

    // 2. Database update (for Vercel serverless multi-instance cross-device sync)
    try {
      const dbReady = await connectDB();
      if (dbReady) {
        await SignalModel.create({
          meetingCode: code,
          from: resolvedFrom,
          to: toTarget,
          type,
          payload,
          createdAt: new Date(timestamp),
        });
      }
    } catch (dbErr) {
      console.warn('[Signal Route] DB signal persistence warning:', dbErr);
    }

    return NextResponse.json({ success: true, timestamp });
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
    const peerId = searchParams.get('peerId')?.trim();
    const since = parseInt(searchParams.get('since') || '0', 10);
    const now = Date.now();

    try {
      const dbReady = await connectDB();
      if (dbReady) {
        const query: any = {
          meetingCode: code,
          createdAt: { $gt: new Date(since) },
        };
        if (peerId) {
          query.from = { $ne: peerId };
          query.$or = [{ to: 'all' }, { to: peerId }, { to: { $exists: false } }, { to: null }];
        }

        const docs = await SignalModel.find(query).sort({ createdAt: 1 }).lean();
        const messages = docs.map((doc: any) => ({
          from: doc.from,
          to: doc.to,
          type: doc.type,
          payload: doc.payload,
          timestamp: new Date(doc.createdAt).getTime(),
        }));

        return NextResponse.json({ signals: messages, serverTime: now });
      }
    } catch (dbErr) {
      console.warn('[Signal Route] DB signal fetch fallback:', dbErr);
    }

    // In-memory fallback
    const queue = inMemoryStore.signals.get(code) || [];
    const messages = queue.filter(
      (item) =>
        item.timestamp > since &&
        (!peerId || item.from !== peerId) &&
        (!item.to || item.to === 'all' || item.to === peerId)
    );

    return NextResponse.json({ signals: messages, serverTime: now });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
