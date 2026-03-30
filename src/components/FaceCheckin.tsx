'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ScanFace, CheckCircle, XCircle, Loader2, Camera } from 'lucide-react';
import { faceApi } from '@/lib/api';

// face-api.js weights hosted on GitHub (npm package doesn't bundle weights)
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
const STABLE_FRAMES   = 15;   // face must be detected this many consecutive frames before auto-capture
const AUTO_CAPTURE_MS = 500;  // delay after stable detection before actually firing

type Stage = 'loading' | 'scanning' | 'verifying' | 'success' | 'failed' | 'error' | 'already_in' | 'already_out' | 'not_checked_in';
type Mode  = 'checkin' | 'checkout';

interface Props {
  employeeId:   string;
  employeeName: string;
  mode?:        Mode;      // default: 'checkin'
  onClose:      () => void;
  onSuccess:    () => void;
}

export default function FaceCheckin({ employeeId, employeeName, mode = 'checkin', onClose, onSuccess }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number | null>(null);
  const isActiveRef = useRef(true);

  const stableCountRef  = useRef(0);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFiredRef     = useRef(false);  // prevent double-fire

  const [stage,       setStage]       = useState<Stage>('loading');
  const [confidence,  setConfidence]  = useState(0);
  const [stableCount, setStableCount] = useState(0);
  const [faceInFrame, setFaceInFrame] = useState(false);
  const [message,     setMessage]     = useState('');

  useEffect(() => {
    isActiveRef.current = true;
    init();
    return () => {
      isActiveRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (rafRef.current)          cancelAnimationFrame(rafRef.current);
    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    if (streamRef.current)       streamRef.current.getTracks().forEach((t) => t.stop());
  };

  const init = async () => {
    try {
      const faceapi = await import('face-api.js');
      if (!isActiveRef.current) return;

      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      }
      if (!isActiveRef.current) return;

      // ── Portrait camera: 720×1280 (9:16) ─────────────────────────────────
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width:  { ideal: 720 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9 / 16 },
        },
      });
      if (!isActiveRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStage('scanning');
      startLoop(faceapi);
    } catch (err: any) {
      if (!isActiveRef.current) return;
      const msg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Allow camera permission and retry.'
        : 'Failed to load face detection. Check your connection and retry.';
      setMessage(msg);
      setStage('error');
    }
  };

  const startLoop = (faceapi: any) => {
    const detect = async () => {
      if (!isActiveRef.current || hasFiredRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 3) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const options    = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.55 });
      const detections = await faceapi
        .detectAllFaces(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!isActiveRef.current) return;

      const canvas = canvasRef.current;
      if (canvas && videoRef.current) {
        // Sync canvas to actual video dimensions (preserves portrait ratio)
        const vw = videoRef.current.videoWidth  || videoRef.current.clientWidth;
        const vh = videoRef.current.videoHeight || videoRef.current.clientHeight;
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width  = vw;
          canvas.height = vh;
        }

        const dims   = faceapi.matchDimensions(canvas, videoRef.current, true);
        const result = faceapi.resizeResults(detections, dims);
        const ctx    = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result.length > 0) {
          setFaceInFrame(true);
          const det = result[0];
          const box = det.detection.box;
          stableCountRef.current = Math.min(stableCountRef.current + 1, STABLE_FRAMES);
          setStableCount(stableCountRef.current);

          // Box colour → progress from red to green as stability grows
          const ratio  = stableCountRef.current / STABLE_FRAMES;
          const r      = Math.round(239 - ratio * (239 - 34));
          const g      = Math.round(68  + ratio * (197 - 68));
          const colour = `rgb(${r},${g},68)`;

          // Rounded bounding box
          ctx.strokeStyle = colour;
          ctx.lineWidth   = 2.5;
          const rad = 8;
          ctx.beginPath();
          ctx.moveTo(box.x + rad, box.y);
          ctx.lineTo(box.x + box.width - rad, box.y);
          ctx.arcTo(box.x + box.width, box.y, box.x + box.width, box.y + rad, rad);
          ctx.lineTo(box.x + box.width, box.y + box.height - rad);
          ctx.arcTo(box.x + box.width, box.y + box.height, box.x + box.width - rad, box.y + box.height, rad);
          ctx.lineTo(box.x + rad, box.y + box.height);
          ctx.arcTo(box.x, box.y + box.height, box.x, box.y + box.height - rad, rad);
          ctx.lineTo(box.x, box.y + rad);
          ctx.arcTo(box.x, box.y, box.x + rad, box.y, rad);
          ctx.closePath();
          ctx.stroke();

          // Corner accents
          const cl = 16;
          ctx.lineWidth   = 4;
          ctx.lineCap     = 'round';
          const corners: [number, number, number, number][] = [
            [box.x, box.y, 1, 1],
            [box.x + box.width, box.y, -1, 1],
            [box.x, box.y + box.height, 1, -1],
            [box.x + box.width, box.y + box.height, -1, -1],
          ];
          corners.forEach(([cx, cy, dx, dy]) => {
            ctx.strokeStyle = colour;
            ctx.beginPath();
            ctx.moveTo(cx + dx * cl, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + dy * cl);
            ctx.stroke();
          });

          // Auto-fire when face has been stable long enough
          if (stableCountRef.current >= STABLE_FRAMES && !hasFiredRef.current) {
            hasFiredRef.current = true;
            setStage('verifying');
            cleanup();
            await verify(det.descriptor);
            return;
          }
        } else {
          setFaceInFrame(false);
          // Face lost — reset stability
          stableCountRef.current = Math.max(0, stableCountRef.current - 2);
          setStableCount(stableCountRef.current);
        }
      }

      if (isActiveRef.current) {
        rafRef.current = requestAnimationFrame(detect);
      }
    };

    rafRef.current = requestAnimationFrame(detect);
  };

  const verify = async (descriptor: Float32Array) => {
    try {
      setStage('verifying');
      const res = mode === 'checkout'
        ? await faceApi.checkout(employeeId, Array.from(descriptor))
        : await faceApi.checkin(employeeId, Array.from(descriptor));
      if (!isActiveRef.current) return;
      setConfidence(res.data.data?.confidence || 99);
      setMessage(res.data.message);
      setStage('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      if (!isActiveRef.current) return;
      const status = err.response?.status;
      const msg    = err.response?.data?.message || 'Verification failed. Please try again.';
      setConfidence(err.response?.data?.confidence || 0);
      setMessage(msg);
      if (status === 409) {
        // 409 can mean "already checked in" or "already checked out" or "not checked in"
        const errMsg = err.response?.data?.message || '';
        if (errMsg.toLowerCase().includes('not checked in')) {
          setStage('not_checked_in');
        } else if (mode === 'checkout') {
          setStage('already_out');
        } else {
          setStage('already_in');
        }
      } else if (status === 401) {
        setStage('failed');
      } else {
        setStage('error');
      }
    }
  };

  const retry = () => {
    hasFiredRef.current    = false;
    stableCountRef.current = 0;
    setStableCount(0);
    setFaceInFrame(false);
    setConfidence(0);
    setMessage('');
    setStage('loading');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    isActiveRef.current = true;
    init();
  };

  // ── Derived progress percentage ───────────────────────────────────────────
  const progress = Math.round((stableCount / STABLE_FRAMES) * 100);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <ScanFace className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {mode === 'checkout' ? 'Face Check-out' : 'Face Check-in'}
              </h2>
              <p className="text-xs text-gray-500">{employeeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Portrait camera container (9:16) ────────────────────────────── */}
        <div className="relative bg-black overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '60vh' }}>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Face oval guide — portrait proportions */}
          {stage === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="rounded-full border-2 transition-all duration-300"
                style={{
                  width: '62%',
                  aspectRatio: '3/4',
                  borderColor: faceInFrame ? '#22c55e' : 'rgba(255,255,255,0.35)',
                  borderStyle: faceInFrame ? 'solid' : 'dashed',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                }}
              />
            </div>
          )}

          {/* Loading state */}
          {stage === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-sm font-medium">Initialising camera…</p>
              <p className="text-xs text-white/50">First time may take ~10 s</p>
            </div>
          )}

          {/* No face prompt */}
          {stage === 'scanning' && !faceInFrame && stableCount === 0 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <span className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                <Camera className="w-4 h-4 opacity-70" /> Look at the camera
              </span>
            </div>
          )}

          {/* Stability hint when face detected */}
          {stage === 'scanning' && faceInFrame && progress < 100 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <span className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
                Hold still… {progress}%
              </span>
            </div>
          )}

          {/* Verifying overlay */}
          {stage === 'verifying' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="text-base font-semibold">Verifying identity…</p>
            </div>
          )}

          {/* Success overlay */}
          {stage === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-600/90 text-white gap-2">
              <CheckCircle className="w-20 h-20 drop-shadow-lg animate-bounce" />
              <p className="text-2xl font-bold">{mode === 'checkout' ? 'Checked Out!' : 'Verified!'}</p>
              <p className="text-sm opacity-90">{message}</p>
              {confidence > 0 && (
                <div className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mt-1">
                  Confidence: {confidence}%
                </div>
              )}
            </div>
          )}

          {/* Failed / already_in / already_out / not_checked_in / error overlay */}
          {(stage === 'failed' || stage === 'already_in' || stage === 'already_out' || stage === 'not_checked_in' || stage === 'error') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/85 text-white gap-3 p-5 text-center">
              <XCircle className="w-16 h-16" />
              <p className="font-semibold text-base">{
                stage === 'already_in'      ? 'Already Checked In'   :
                stage === 'already_out'     ? 'Already Checked Out'  :
                stage === 'not_checked_in'  ? 'Not Checked In Yet'   :
                stage === 'failed'          ? 'Face Not Recognized'  :
                'Camera Error'
              }</p>
              <p className="text-sm opacity-80">{message}</p>
              {stage === 'failed' && confidence > 0 && (
                <div className="bg-white/10 px-3 py-1 rounded-full text-xs">
                  Confidence: {confidence}% (need &gt;50%)
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom panel ─────────────────────────────────────────────────── */}
        <div className="px-5 pt-3 pb-4 shrink-0">

          {/* Stability progress bar */}
          {stage === 'scanning' && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Face stability</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                    background: `hsl(${progress * 1.2}, 80%, 45%)`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-center">
                {progress < 100
                  ? 'Hold still and look directly at the camera…'
                  : 'Capturing…'}
              </p>
            </div>
          )}

          {/* Tips */}
          {stage === 'scanning' && (
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1 mb-3">
              <p className="font-semibold">Tips for best results:</p>
              <ul className="space-y-0.5 text-blue-600">
                <li>👁 Look directly at the camera</li>
                <li>💡 Ensure good lighting on your face</li>
                <li>😐 Keep a neutral expression</li>
                <li>📱 Remove glasses if recognition fails</li>
              </ul>
            </div>
          )}

          {/* Retry / Close buttons */}
          {(stage === 'failed' || stage === 'error') && (
            <div className="flex gap-3 mt-1">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={retry}   className="btn-primary flex-1">Try Again</button>
            </div>
          )}
          {(stage === 'already_in' || stage === 'already_out' || stage === 'not_checked_in') && (
            <button onClick={onClose} className="btn-primary w-full mt-1">Got it</button>
          )}
        </div>
      </div>
    </div>
  );
}
