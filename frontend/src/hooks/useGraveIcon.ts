import { useEffect, useState } from 'react';
import tombstoneImage from '../assets/graveyard_icon.png'; // パスは必要に応じて調整

export function useGraveIcon() {
  const [graveIconSrc, setGraveIconSrc] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = tombstoneImage;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // RGBがすべて255（白）なら透明にする
        if (r === 255 && g === 255 && b === 255) {
          data[i + 3] = 0; // アルファを0（透明）に
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const newSrc = canvas.toDataURL();
      setGraveIconSrc(newSrc);
    };
  }, []);

  return graveIconSrc;
}

