import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Image shape utilities
export type ImageShape = 'square' | 'circle' | 'triangle' | 'oval' | 'rectangle' | 'diamond' | 'hexagon';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';

// CSS clip-path definitions for different shapes
export const getShapeClipPath = (shape: ImageShape): string => {
  switch (shape) {
    case 'circle':
      return 'circle(50% at 50% 50%)';
    case 'triangle':
      return 'polygon(50% 0%, 0% 100%, 100% 100%)';
    case 'oval':
      return 'ellipse(50% 40% at 50% 50%)';
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'hexagon':
      return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'square':
    case 'rectangle':
    default:
      return 'none'; // No clipping for square/rectangle - handled by aspect ratio
  }
};

// Get CSS styles for shape (combining clip-path and aspect ratio)
export const getShapeStyles = (shape: ImageShape, aspectRatio: AspectRatio) => {
  const clipPath = getShapeClipPath(shape);
  
  // Convert aspect ratio to CSS aspect-ratio value
  const aspectRatioValue = aspectRatio === '1:1' ? '1' : 
                          aspectRatio === '16:9' ? '16/9' :
                          aspectRatio === '9:16' ? '9/16' :
                          aspectRatio === '4:3' ? '4/3' : '1';

  return {
    clipPath: clipPath !== 'none' ? clipPath : undefined,
    aspectRatio: aspectRatioValue,
    width: '100%',
    height: 'auto',
  };
};

// Get dimensions for different aspect ratios (for API requests)
export const getAspectRatioDimensions = (aspectRatio: AspectRatio, baseSize: number = 512) => {
  switch (aspectRatio) {
    case '1:1':
      return { width: baseSize, height: baseSize };
    case '16:9':
      return { width: Math.round(baseSize * 16/9), height: baseSize };
    case '9:16':
      return { width: baseSize, height: Math.round(baseSize * 16/9) };
    case '4:3':
      return { width: Math.round(baseSize * 4/3), height: baseSize };
    default:
      return { width: baseSize, height: baseSize };
  }
};
