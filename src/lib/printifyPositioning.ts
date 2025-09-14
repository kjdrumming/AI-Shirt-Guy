import type { ImageShape, AspectRatio } from './utils';

/**
 * Calculate Printify positioning coordinates based on shape and aspect ratio
 * Printify uses a coordinate system from [0,0] to [1,1] where:
 * - x: 0 = left edge, 0.5 = center, 1 = right edge
 * - y: 0 = top edge, 0.5 = center, 1 = bottom edge
 */
export function calculatePrintifyPositioning(shape: ImageShape, aspectRatio: AspectRatio) {
  // Base positioning - higher on chest area
  let x = 0.5; // Always center horizontally
  let y = 0.3; // Higher positioning (was 0.5 center)
  let scale = 0.8; // Base scale

  // Adjust positioning based on shape
  switch (shape) {
    case 'circle':
      // Circles work well with standard positioning
      scale = 0.7; // Slightly smaller to ensure the circle fits well
      break;
    
    case 'triangle':
      // Triangles might need slight adjustment
      y = 0.32; // Slightly lower to account for triangle shape
      scale = 0.75;
      break;
    
    case 'oval':
      // Ovals work similar to circles but might be wider/taller
      scale = 0.75;
      break;
    
    case 'diamond':
      // Diamonds work well centered
      scale = 0.7;
      break;
    
    case 'hexagon':
      // Hexagons work well centered
      scale = 0.75;
      break;
    
    case 'rectangle':
      // Rectangles might extend wider
      scale = 0.8;
      break;
    
    case 'square':
    default:
      // Standard positioning for squares
      scale = 0.8;
      break;
  }

  // Adjust scale based on aspect ratio
  switch (aspectRatio) {
    case '16:9':
      // Wide designs - might need to be smaller to fit
      scale *= 0.85;
      break;
    
    case '9:16':
      // Tall designs - can be a bit larger vertically
      scale *= 0.9;
      y = 0.35; // Move down slightly for tall designs
      break;
    
    case '4:3':
      // Slightly wider than square
      scale *= 0.9;
      break;
    
    case '1:1':
    default:
      // Square - use base scale
      break;
  }

  return {
    x,
    y,
    scale,
    angle: 0 // No rotation
  };
}