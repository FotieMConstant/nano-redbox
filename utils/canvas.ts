import React from 'react';
import { Annotation, AnnotationColor } from "../types";
import { COLOR_MAP, STROKE_WIDTH, FONT_SIZE_BASE, MAX_IMAGE_DIMENSION } from "../constants";

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const downscaleImageIfNeeded = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (!e.target?.result) return reject("Failed to read file");
      const img = await loadImage(e.target.result as string);
      
      let { width, height } = img;
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
        resolve(e.target.result as string);
        return;
      }

      const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
      width *= scale;
      height *= scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("No canvas context");

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(file.type, 0.9));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const flattenAnnotations = async (
  imageSrc: string,
  annotations: Annotation[],
  mimeType: string = 'image/png'
): Promise<string> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Could not get canvas context");

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Draw annotations
  annotations.forEach(ann => {
    const color = COLOR_MAP[ann.color];
    
    // Draw Box
    ctx.strokeStyle = color;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);

    // Draw Text
    if (ann.text) {
      // Dynamic font size based on image size but clamped
      const fontSize = Math.max(16, Math.floor(img.width / 50)); 
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      
      // Simple text wrapping
      const words = ann.text.split(' ');
      let line = '';
      let y = ann.y + 5; // Padding
      const x = ann.x + 5; // Padding
      const maxWidth = ann.width - 10;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, y);
          line = words[n] + ' ';
          y += fontSize * 1.2;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
    }
  });

  return canvas.toDataURL(mimeType);
};

export const getRelativePointerPosition = (
  event: React.MouseEvent | MouseEvent,
  element: HTMLElement
) => {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};