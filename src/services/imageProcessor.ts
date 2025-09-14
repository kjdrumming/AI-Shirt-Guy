import type { ImageShape, AspectRatio } from '@/lib/utils';

/**
 * Process an image to apply shape cutouts and prepare it for printing
 */
export class ImageProcessor {
  
  /**
   * Apply shape cutout to an image using canvas processing
   * This creates a new image with the shape actually cut out, not just CSS styling
   */
  static async applyShapeCutout(imageUrl: string, shape: ImageShape, aspectRatio: AspectRatio): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS
      
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create clipping path based on shape
        ctx.save();
        this.createClippingPath(ctx, shape, canvas.width, canvas.height);
        ctx.clip();
        
        // Draw the image within the clipping path
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        
        // Convert to data URL (PNG to preserve transparency)
        const processedImageUrl = canvas.toDataURL('image/png');
        resolve(processedImageUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }

  /**
   * Create clipping path for different shapes
   */
  private static createClippingPath(ctx: CanvasRenderingContext2D, shape: ImageShape, width: number, height: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2;

    ctx.beginPath();
    
    switch (shape) {
      case 'circle':
        ctx.arc(centerX, centerY, radius * 0.9, 0, 2 * Math.PI);
        break;
        
      case 'triangle':
        ctx.moveTo(centerX, centerY - radius * 0.8);
        ctx.lineTo(centerX - radius * 0.8, centerY + radius * 0.8);
        ctx.lineTo(centerX + radius * 0.8, centerY + radius * 0.8);
        ctx.closePath();
        break;
        
      case 'oval':
        ctx.ellipse(centerX, centerY, radius * 0.9, radius * 0.6, 0, 0, 2 * Math.PI);
        break;
        
      case 'diamond':
        ctx.moveTo(centerX, centerY - radius * 0.8);
        ctx.lineTo(centerX + radius * 0.8, centerY);
        ctx.lineTo(centerX, centerY + radius * 0.8);
        ctx.lineTo(centerX - radius * 0.8, centerY);
        ctx.closePath();
        break;
        
      case 'hexagon':
        const hexRadius = radius * 0.8;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = centerX + hexRadius * Math.cos(angle);
          const y = centerY + hexRadius * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        break;
        
      case 'rectangle':
        const rectWidth = width * 0.8;
        const rectHeight = height * 0.6;
        ctx.rect(centerX - rectWidth/2, centerY - rectHeight/2, rectWidth, rectHeight);
        break;
        
      case 'square':
      default:
        const squareSize = Math.min(width, height) * 0.8;
        ctx.rect(centerX - squareSize/2, centerY - squareSize/2, squareSize, squareSize);
        break;
    }
  }

  /**
   * Add a subtle drop shadow or glow effect to enhance the shape
   */
  static async addShapeEffects(imageUrl: string, shape: ImageShape): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Make canvas slightly larger to accommodate effects
        const padding = 20;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        
        // Clear with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Add subtle shadow for non-circular shapes
        if (shape !== 'square' && shape !== 'rectangle') {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }
        
        // Draw the image with padding offset
        ctx.drawImage(img, padding, padding);
        ctx.restore();
        
        const enhancedImageUrl = canvas.toDataURL('image/png');
        resolve(enhancedImageUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for effects'));
      };
      
      img.src = imageUrl;
    });
  }
}