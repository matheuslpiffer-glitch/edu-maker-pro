import { useEffect, useRef, useState } from 'react';
import { Play, Pause, FileDown } from 'lucide-react';
import { formatTimecode } from '@/lib/video-scenes';

interface VideoLabPlayerProps {
  /** Cenas geradas, na ordem de reprodução. */
  segments: string[];
  /** Duração total pedida (segundos), usada na timeline. */
  durationSeconds: number;
  subtitleText?: string | null;
  showSubtitles?: boolean;
  className?: string;
}

/**
 * Player do EduCreator VideoLab: reproduz as cenas em sequência e exibe
 * uma timeline única com o tempo total do vídeo (até 01:00).
 */
export default function VideoLabPlayer({
  segments,
  durationSeconds,
  subtitleText,
  showSubtitles = true,
  className = '',
}: VideoLabPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);
  const [elapsedBefore, setElapsedBefore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const perScene = durationSeconds / Math.max(segments.length, 1);

  useEffect(() => {
    setCurrent(0);
    setElapsedBefore(0);
    setElapsed(0);
  }, [segments.join('|')]);

  const handleEnded = () => {
    if (current < segments.length - 1) {
      const next = current + 1;
      setElapsedBefore(next * perScene);
      setCurrent(next);
    } else {
      setIsPlaying(false);
      setElapsed(durationSeconds);
    }
  };

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const progress = Math.min(100, (elapsed / Math.max(durationSeconds, 1)) * 100);

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-800 bg-black ${className}`}>
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          key={segments[current]}
          src={segments[current]}
          autoPlay={isPlaying}
          playsInline
          onTimeUpdate={(e) => setElapsed(elapsedBefore + e.currentTarget.currentTime)}
          onEnded={handleEnded}
          className="w-full h-full object-contain"
        />
        {subtitleText && showSubtitles && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 pointer-events-none">
            <div className="bg-black/70 px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-bold text-center">
              {subtitleText}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 px-3 py-2 space-y-2">
        <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-1.5 rounded-full bg-white text-slate-900 hover:scale-105 transition-transform"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <span className="text-[11px] font-mono text-slate-300">
              {formatTimecode(elapsed)} / {formatTimecode(durationSeconds)}
            </span>
            <span className="text-[10px] text-slate-500">
              Cena {current + 1} de {segments.length}
            </span>
          </div>
          <a
            href={segments[current]}
            download={`mat-video-cena-${current + 1}.mp4`}
            className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-500 transition-colors"
          >
            <FileDown className="w-3 h-3" />
            BAIXAR CENA
          </a>
        </div>
      </div>
    </div>
  );
}
