'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ScanFace, CheckCircle, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { faceApi } from '@/lib/api';

const MODEL_URL        = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
const CAPTURE_TARGET   = 5;
const BLINK_EAR_CLOSED = 0.21;
const BLINK_EAR_OPEN   = 0.27;
const CAPTURE_INTERVAL = 10;

type Stage = 'loading' | 'align' | 'blink' | 'capturing' | 'processing' | 'success' | 'error';

interface Props {
  employeeId:   string;
  employeeName: string;
  onClose:      () => void;
  onSuccess:    () => void;
}

function calcEAR(pts: { x: number; y: number }[]): number {
  const d = (a: typeof pts[0], b: typeof pts[0]) => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
  return (d(pts[1],pts[5]) + d(pts[2],pts[4])) / (2 * d(pts[0],pts[3]));
}

export default function FaceRegistration({ employeeId, employeeName, onClose, onSuccess }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number | null>(null);
  const isActiveRef = useRef(true);

  const blinkDoneRef   = useRef(false);
  const eyeStateRef    = useRef<'open'|'closed'>('open');
  const descriptorsRef = useRef<Float32Array[]>([]);
  const frameCountRef  = useRef(0);

  const [stage,        setStage]        = useState<Stage>('loading');
  const [captureCount, setCaptureCount] = useState(0);
  const [faceInFrame,  setFaceInFrame]  = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    isActiveRef.current = true;
    init();
    return () => { isActiveRef.current = false; cleanup(); };
  }, []);

  const cleanup = () => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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
          aspectRatio: { ideal: 9/16 },
        },
      });
      if (!isActiveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStage('align');
      startLoop(faceapi);
    } catch (err: any) {
      if (!isActiveRef.current) return;
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permission and try again.'
          : `Failed to initialise: ${err.message}`
      );
      setStage('error');
    }
  };

  const startLoop = (faceapi: any) => {
    const detect = async () => {
      if (!isActiveRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 3) {
        rafRef.current = requestAnimationFrame(detect); return;
      }

      const options    = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 });
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
          const col = blinkDoneRef.current ? '#22c55e' : '#3b82f6';

          // Rounded bounding box
          ctx.strokeStyle = col;
          ctx.lineWidth   = 2.5;
          ctx.beginPath();
          const r = 8;
          ctx.moveTo(box.x + r, box.y);
          ctx.lineTo(box.x + box.width - r, box.y);
          ctx.arcTo(box.x + box.width, box.y, box.x + box.width, box.y + r, r);
          ctx.lineTo(box.x + box.width, box.y + box.height - r);
          ctx.arcTo(box.x + box.width, box.y + box.height, box.x + box.width - r, box.y + box.height, r);
          ctx.lineTo(box.x + r, box.y + box.height);
          ctx.arcTo(box.x, box.y + box.height, box.x, box.y + box.height - r, r);
          ctx.lineTo(box.x, box.y + r);
          ctx.arcTo(box.x, box.y, box.x + r, box.y, r);
          ctx.closePath();
          ctx.stroke();

          // Corner accent lines
          const cl = 18;
          ctx.lineWidth   = 4;
          ctx.strokeStyle = col;
          ctx.lineCap     = 'round';
          const corners = [[box.x, box.y, 1, 1], [box.x + box.width, box.y, -1, 1],
                           [box.x, box.y + box.height, 1, -1], [box.x + box.width, box.y + box.height, -1, -1]];
          corners.forEach(([cx, cy, dx, dy]) => {
            ctx.beginPath(); ctx.moveTo(cx + dx * cl, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * cl); ctx.stroke();
          });

          // ── Blink detection ──────────────────────────────────────────────
          if (!blinkDoneRef.current) {
            setStage('blink');
            const pos      = det.landmarks.positions;
            const leftEye  = Array.from({length:6}, (_,i) => pos[36+i]) as any;
            const rightEye = Array.from({length:6}, (_,i) => pos[42+i]) as any;
            const ear      = (calcEAR(leftEye) + calcEAR(rightEye)) / 2;

            if (eyeStateRef.current === 'open'   && ear < BLINK_EAR_CLOSED) eyeStateRef.current = 'closed';
            if (eyeStateRef.current === 'closed' && ear > BLINK_EAR_OPEN)   {
              blinkDoneRef.current = true;
              eyeStateRef.current  = 'open';
              setStage('capturing');
            }
          }

          // ── Capture phase ────────────────────────────────────────────────
          if (blinkDoneRef.current && descriptorsRef.current.length < CAPTURE_TARGET) {
            frameCountRef.current++;
            if (frameCountRef.current % CAPTURE_INTERVAL === 0) {
              descriptorsRef.current.push(det.descriptor);
              const n = descriptorsRef.current.length;
              setCaptureCount(n);
              if (n >= CAPTURE_TARGET) {
                setStage('processing');
                cleanup();
                await saveDescriptors();
                return;
              }
            }
          }
        } else {
          setFaceInFrame(false);
        }
      }

      if (isActiveRef.current) rafRef.current = requestAnimationFrame(detect);
    };
    rafRef.current = requestAnimationFrame(detect);
  };

  const averageDescriptor = (descs: Float32Array[]): number[] => {
    const avg = new Array(128).fill(0);
    descs.forEach(d => d.forEach((v,i) => avg[i] += v));
    return avg.map(v => v / descs.length);
  };

  const saveDescriptors = async () => {
    try {
      await faceApi.register(employeeId, averageDescriptor(descriptorsRef.current));
      setStage('success');
      toast.success('Face registered successfully!');
      setTimeout(onSuccess, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save face data. Please try again.');
      setStage('error');
    }
  };

  const retry = () => {
    descriptorsRef.current = []; blinkDoneRef.current = false;
    eyeStateRef.current = 'open'; frameCountRef.current = 0;
    setCaptureCount(0); setError(''); setFaceInFrame(false);
    setStage('loading');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null; isActiveRef.current = true;
    init();
  };

  const stageLabel: Record<Stage, { title: string; sub: string; col: string }> = {
    loading:    { title: 'Loading Models…',      sub: 'Downloading AI face detection models (one-time)', col: 'text-gray-500'  },
    align:      { title: 'Position Your Face',   sub: 'Centre your face inside the oval and look ahead', col: 'text-blue-600'  },
    blink:      { title: 'Blink to Verify',      sub: '👁 Blink naturally — confirms you are live',       col: 'text-amber-600' },
    capturing:  { title: 'Capturing…',           sub: 'Hold still — slowly tilt head slightly side-to-side', col: 'text-green-600' },
    processing: { title: 'Processing…',          sub: 'Encoding and saving your face data securely',    col: 'text-blue-600'  },
    success:    { title: 'Face Registered! ✓',   sub: 'You can now use Face Check-in from your dashboard', col: 'text-green-600' },
    error:      { title: 'Something went wrong', sub: error,                                            col: 'text-red-600'   },
  };
  const info = stageLabel[stage];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <ScanFace className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Register Face</h2>
              <p className="text-xs text-gray-500">{employeeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Portrait camera container (9:16) ─────────────────────────── */}
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

          {/* Face oval guide — centred, portrait proportions */}
          {(stage === 'align' || stage === 'blink' || stage === 'capturing') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Dark mask with oval cutout via box-shadow */}
              <div
                className="rounded-full border-2 transition-colors duration-300"
                style={{
                  width:  '62%',
                  aspectRatio: '3/4',
                  borderColor: faceInFrame
                    ? (stage === 'capturing' ? '#22c55e' : '#3b82f6')
                    : 'rgba(255,255,255,0.35)',
                  borderStyle: faceInFrame ? 'solid' : 'dashed',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                }}
              />
            </div>
          )}

          {/* Loading */}
          {stage === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white gap-3">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading AI models…</p>
              <p className="text-xs text-white/50">First time may take ~10 s</p>
            </div>
          )}

          {/* No face prompt */}
          {(stage === 'align') && !faceInFrame && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <span className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
                👤 Position face inside the oval
              </span>
            </div>
          )}

          {/* Blink prompt */}
          {stage === 'blink' && faceInFrame && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <span className="bg-amber-500/90 text-white text-xs font-bold px-5 py-2 rounded-full animate-pulse shadow-lg">
                👁 Blink now to confirm you&apos;re live
              </span>
            </div>
          )}

          {/* Capture progress */}
          {stage === 'capturing' && (
            <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {Array.from({length: CAPTURE_TARGET}).map((_,i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i < captureCount ? 'bg-green-400 scale-125' : 'bg-white/30'}`} />
                ))}
              </div>
              <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                Capturing {captureCount}/{CAPTURE_TARGET}
              </span>
            </div>
          )}

          {/* Success */}
          {stage === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-600/90 text-white">
              <CheckCircle className="w-20 h-20 mb-3 drop-shadow-xl" />
              <p className="text-2xl font-bold">Registered!</p>
              <p className="text-sm opacity-80 mt-1">Face saved securely</p>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/85 text-white p-6 text-center gap-3">
              <AlertCircle className="w-12 h-12" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Bottom panel */}
        <div className="px-5 pt-4 pb-4 shrink-0">
          {/* Stage label */}
          <div className="text-center mb-3">
            <p className={`font-semibold text-sm ${info.col}`}>{info.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{info.sub}</p>
          </div>

          {/* Step bar */}
          <div className="flex items-center justify-center gap-1.5 text-xs mb-3">
            {['Align','Blink','Capture','Save'].map((s, i) => {
              const stageIdx = ['align','blink','capturing','processing'].indexOf(stage);
              const done  = i < stageIdx || stage === 'success';
              const active = i === stageIdx || (stage === 'success' && i === 3);
              return (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full transition-colors ${active ? 'bg-blue-100 text-blue-700 font-bold' : done ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {done && !active ? '✓' : `${i+1}.`} {s}
                  </span>
                  {i < 3 && <span className="text-gray-300">→</span>}
                </span>
              );
            })}
          </div>

          {/* Retry button */}
          {stage === 'error' && (
            <button onClick={retry} className="btn-primary w-full flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          )}

          {/* Privacy note */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-green-500" />
            <span>Stored as a math vector — not a photo. Private &amp; secure.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
