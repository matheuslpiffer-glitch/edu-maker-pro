import { cn } from '@/lib/utils';

interface MatAvatarArtworkProps {
  src: string;
  alt: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  className?: string;
}

export default function MatAvatarArtwork({
  src,
  alt,
  zoom,
  offsetX,
  offsetY,
  className,
}: MatAvatarArtworkProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('h-full w-full bg-no-repeat bg-background', className)}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: `${zoom}%`,
        backgroundPosition: `${offsetX}% ${offsetY}%`,
      }}
    />
  );
}
