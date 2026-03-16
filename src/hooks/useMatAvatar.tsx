import { useState } from 'react';

const AVATAR_KEY = 'mat_custom_avatar';
const ZOOM_KEY = 'mat_avatar_zoom';
const OFFSET_X_KEY = 'mat_avatar_offset_x';
const OFFSET_Y_KEY = 'mat_avatar_offset_y';

export function useMatAvatar() {
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    try { return localStorage.getItem(AVATAR_KEY); } catch { return null; }
  });

  const [zoom, setZoom] = useState<number>(() => {
    try { return Number(localStorage.getItem(ZOOM_KEY)) || 130; } catch { return 130; }
  });

  const [offsetX, setOffsetX] = useState<number>(() => {
    try { return Number(localStorage.getItem(OFFSET_X_KEY)) || 50; } catch { return 50; }
  });

  const [offsetY, setOffsetY] = useState<number>(() => {
    try { return Number(localStorage.getItem(OFFSET_Y_KEY)) || 15; } catch { return 15; }
  });

  const saveAvatar = (dataUrl: string, zoomVal: number, ox?: number, oy?: number) => {
    localStorage.setItem(AVATAR_KEY, dataUrl);
    localStorage.setItem(ZOOM_KEY, String(zoomVal));
    if (ox !== undefined) { localStorage.setItem(OFFSET_X_KEY, String(ox)); setOffsetX(ox); }
    if (oy !== undefined) { localStorage.setItem(OFFSET_Y_KEY, String(oy)); setOffsetY(oy); }
    setCustomAvatar(dataUrl);
    setZoom(zoomVal);
  };

  const clearAvatar = () => {
    localStorage.removeItem(AVATAR_KEY);
    localStorage.removeItem(ZOOM_KEY);
    localStorage.removeItem(OFFSET_X_KEY);
    localStorage.removeItem(OFFSET_Y_KEY);
    setCustomAvatar(null);
    setZoom(130);
    setOffsetX(50);
    setOffsetY(15);
  };

  return { customAvatar, zoom, offsetX, offsetY, saveAvatar, clearAvatar };
}
