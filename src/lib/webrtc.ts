/**
 * WebRTC and ICE Configuration matching RFC 8445 & Paper Section 6.2 / 9.4
 */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export const PEER_CONFIG = {
  config: {
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
  },
  debug: 1,
};

/**
 * Helper to monitor audio level for speaking indicator
 */
export function createAudioAnalyser(
  stream: MediaStream,
  onSpeakingChange: (isSpeaking: boolean) => void,
  threshold = 0.05
) {
  try {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return null;

    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let intervalId: NodeJS.Timeout;
    let speaking = false;

    const check = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length / 255;
      const isNowSpeaking = avg > threshold;
      if (isNowSpeaking !== speaking) {
        speaking = isNowSpeaking;
        onSpeakingChange(speaking);
      }
    };

    intervalId = setInterval(check, 150);

    return () => {
      clearInterval(intervalId);
      try {
        source.disconnect();
        analyser.disconnect();
        audioCtx.close();
      } catch {
        // ignore
      }
    };
  } catch (err) {
    console.warn('AudioAnalyser initialization error:', err);
    return null;
  }
}
