/**
 * Image shape processing configuration
 */
export const SHAPE_CONFIG = {
  // Processing method: using 'prompt' with smart background removal
  processingMethod: 'prompt' as 'prompt' | 'canvas' | 'both',
  
  // Enable smart background removal to eliminate white backgrounds without clipping
  enableSmartBackgroundRemoval: true,
  
  // Enable enhanced prompts for AI shape generation
  enablePromptEnhancement: true,
  
  // Disabled shape effects to keep original AI quality
  enableShapeEffects: false,
  
  // Shapes that work best with canvas processing
  canvasOptimizedShapes: ['circle', 'triangle', 'oval', 'diamond', 'hexagon'] as const,
  
  // Shapes that work well with prompt engineering alone
  promptOptimizedShapes: ['square', 'rectangle'] as const,
} as const;

export type ShapeProcessingMethod = typeof SHAPE_CONFIG.processingMethod;