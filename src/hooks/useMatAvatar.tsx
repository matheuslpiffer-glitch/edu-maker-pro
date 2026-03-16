import { useState, useEffect } from 'react';

const AVATAR_KEY = 'mat_custom_avatar';
const ZOOM_KEY = 'mat_avatar_zoom';

export function useMatAvatar() {
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    try { return localStorage.getItem(AVATAR_KEY); } catch { return null; }
  });

  const [zoom, setZoom] = useState<number>(() => {
    try { return Number(localStorage.getItem(ZOOM_KEY)) || 130; } catch { return 130; }
  });

  const saveAvatar = (dataUrl: string, zoomVal: number) => {
    localStorage.setItem(AVATAR_KEY, dataUrl);
    localStorage.setItem(ZOOM_KEY, String(zoomVal));
    setCustomAvatar(dataUrl);
    setZoom(zoomVal);
  };

  const saveZoom = (zoomVal: number) => {
    localStorage.setItem(ZOOM_KEY, String(zoomVal));
    setZoom(zoomVal);
  };

  const clearAvatar = () => {
    localStorage.removeItem(AVATAR_KEY);
    localStorage.removeItem(ZOOM_KEY);
    setCustomAvatar(null);
    setZoom(130);
  };

  return { customAvatar, zoom, saveAvatar, saveZoom, clearAvatar };
}
