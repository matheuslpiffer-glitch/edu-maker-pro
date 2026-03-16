import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface Slide {
  title: string;
  content: string[];
  speaker_notes: string;
  activity: string | null;
}

interface Props {
  slides: Slide[];
  skillCode?: string;
  startIndex?: number;
  onClose: () => void;
}

export default function SlidePresenter({ slides, skillCode, startIndex = 0, onClose }: Props) {
  const [current, setCurrent] = useState(startIndex);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [scale, setScale] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => setCurrent(c => Math.min(c + 1, slides.length - 1)), [slides.length]);
  const goPrev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  // Calculate scale on mount and resize
  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Enter fullscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.requestFullscreen?.().catch(() => {});

    const handleFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
          e.preventDefault(); goNext(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          e.preventDefault(); goPrev(); break;
        case 'Home': e.preventDefault(); setCurrent(0); break;
        case 'End': e.preventDefault(); setCurrent(slides.length - 1); break;
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose, slides.length]);

  // Auto-hide cursor
  useEffect(() => {
    const handleMove = () => {
      setCursorHidden(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCursorHidden(true), 3000);
    };
    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const slide = slides[current];
  if (!slide) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none"
      style={{ cursor: cursorHidden ? 'none' : 'default' }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (e.clientX - rect.left > rect.width / 2) goNext();
        else goPrev();
      }}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <div
          className="absolute"
          style={{
            width: 1920, height: 1080,
            left: '50%', top: '50%',
            marginLeft: -960, marginTop: -540,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div className="w-full h-full bg-white flex flex-col justify-center px-[120px] py-[80px]"
            style={{ background: 'linear-gradient(135deg, #f0faf6 0%, #fef9f0 100%)' }}>
            {/* Skill code header */}
            {skillCode && (
              <div className="text-[20px] font-mono text-[#888] mb-[16px]">📋 {skillCode}</div>
            )}
            <h1 className="text-[64px] font-bold text-[#1a7a5a] leading-tight mb-[48px]">
              {slide.title}
            </h1>
            <ul className="space-y-[24px]">
              {slide.content.map((item, i) => (
                <li key={i} className="flex items-start gap-[20px]">
                  <span className="text-[#1a7a5a] text-[36px] leading-none mt-[4px]">•</span>
                  <span className="text-[32px] text-[#333] leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            {slide.activity && (
              <div className="mt-[48px] p-[32px] bg-[#EBF5FB] border border-[#85C1E9] rounded-2xl">
                <span className="text-[28px] text-[#1a5276]">
                  🎯 <strong>Atividade:</strong> {slide.activity}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-mono transition-opacity duration-300"
        style={{ opacity: cursorHidden ? 0 : 1 }}
      >
        {current + 1} / {slides.length}
      </div>

      <button
        className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-opacity duration-300 p-2"
        style={{ opacity: cursorHidden ? 0 : 1 }}
        onClick={(e) => {
          e.stopPropagation();
          if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
          onClose();
        }}
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}
