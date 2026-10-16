import React, { Suspense } from 'react';
import MeetClient from './MeetClient';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function MeetingLoadingFallback() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-3 text-[#f5f5f7]">
      <Loader2 className="w-5 h-5 animate-spin text-[#86868b]" />
      <span className="text-xs text-[#86868b]">Connecting...</span>
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
