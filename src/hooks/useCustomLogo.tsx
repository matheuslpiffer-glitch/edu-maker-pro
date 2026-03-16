import { useState, useRef, useEffect } from 'react';

const LOGO_KEY = 'educreator_custom_logo';

export function useCustomLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOGO_KEY);
    } catch {
      return null;
    }
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => fileRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(LOGO_KEY, dataUrl);
      setLogoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const clearLogo = () => {
    localStorage.removeItem(LOGO_KEY);
    setLogoUrl(null);
  };

  const FileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  return { logoUrl, triggerUpload, clearLogo, FileInput };
}
