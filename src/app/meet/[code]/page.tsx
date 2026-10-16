import React, { Suspense } from 'react';
import MeetClient from './MeetClient';
import { Loader2, Video } from 'lucide-react';

export const dynamic = 'force-dynamic';

function MeetingLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
      <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
        <Video className="w-6 h-6" />
      </div>
      <div className="flex items-center space-x-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span>Entering meeting room...</span>
      </div>
    </div>
  );
}

export default async function MeetPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <Suspense fallback={<MeetingLoadingFallback />}>
      <MeetClient code={code} />
    </Suspense>
  );
}
