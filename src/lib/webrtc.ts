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

/**
 * Mobile-optimized camera track acquisition with facingMode and resilient fallback
 */
export async function acquireCameraTrack(
  facingMode: 'user' | 'environment' = 'user'
): Promise<MediaStreamTrack | null> {
  // Step 1: Ideal facingMode + 720p (high quality front/back camera)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    const track = stream.getVideoTracks()[0];
    if (track) return track;
  } catch (err1) {
    console.warn('[webrtc] Step 1 camera acquisition notice:', err1);
  }

  // Step 2: FacingMode only (vital for mobile portrait cameras & budget smartphones)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
    });
    const track = stream.getVideoTracks()[0];
    if (track) return track;
  } catch (err2) {
    console.warn('[webrtc] Step 2 camera acquisition notice:', err2);
  }

  // Step 3: Generic video fallback
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    return stream.getVideoTracks()[0] || null;
  } catch (err3) {
    console.error('[webrtc] All camera acquisition attempts failed:', err3);
    throw err3;
  }
}

/**
 * Checks if the current client is a smartphone device with at least two cameras (front & rear).
 * Strictly excludes desktop, laptops, and single-camera devices.
 */
export async function checkCanSwitchCamera(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // 1. Detect smartphone environment (strictly exclude desktop and laptop browsers)
  const ua = navigator.userAgent || '';
  const isSmartphone =
    /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile Safari/i.test(ua) ||
    Boolean((navigator as any).userAgentData?.mobile);

  if (!isSmartphone) {
    return false;
  }

  // 2. Query available camera devices (must have at least 2 distinct video inputs)
  if (!navigator.mediaDevices?.enumerateDevices) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');
    return videoInputs.length >= 2;
  } catch (err) {
    console.warn('[webrtc] Error querying camera devices:', err);
    return false;
  }
}

/**
 * Audio track acquisition with fallback
 */
export async function acquireAudioTrack(): Promise<MediaStreamTrack | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const track = stream.getAudioTracks()[0];
    if (track) {
      try {
        const settings = track.getSettings();
        console.log('[webrtc] Enhanced audio track active:', {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          deviceId: settings.deviceId ? 'present' : 'default',
        });
      } catch {}
      return track;
    }
  } catch (err1) {
    console.warn('[webrtc] Enhanced audio acquisition notice:', err1);
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream.getAudioTracks()[0] || null;
  } catch (err2) {
    console.error('[webrtc] Basic audio acquisition failed:', err2);
    throw err2;
  }
}

/**
 * Check if the device is a smartphone with multiple video cameras (e.g. front & back)
 */
export async function hasMultipleCameras(): Promise<boolean> {
  return checkCanSwitchCamera();
}
