import type { ImageShape, AspectRatio } from '@/lib/utils';

/**
 * Smart background removal and processing for t-shirt designs
 */
export class SmartImageProcessor {
  
  /**
   * Remove white/light backgrounds from an image while preserving the design
   * This is better than shape clipping as it keeps the full design intact
   */
  static async removeWhiteBackground(imageUrl: string): Promise<string> {
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
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Remove white and light gray backgrounds
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is white or very light (RGB values close to 255)
          if (r > 240 && g > 240 && b > 240) {
            // Make it transparent
            data[i + 3] = 0; // Set alpha to 0
          }
          // If pixel is light gray
          else if (r > 220 && g > 220 && b > 220 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) {
            // Make it transparent
            data[i + 3] = 0; // Set alpha to 0
          }
        }
        
        // Put the processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to PNG with transparency
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
   * Advanced background removal using edge detection
   * More sophisticated than simple white removal
   */
  static async removeBackgroundSmart(imageUrl: string): Promise<string> {
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
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sample corner pixels to determine background color
        const corners = [
          [0, 0], // top-left
          [canvas.width - 1, 0], // top-right
          [0, canvas.height - 1], // bottom-left
          [canvas.width - 1, canvas.height - 1] // bottom-right
        ];
        
        let backgroundR = 0, backgroundG = 0, backgroundB = 0;
        let validCorners = 0;
        
        corners.forEach(([x, y]) => {
          const index = (y * canvas.width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // Only use corners that are light colors (likely background)
          if (r > 200 && g > 200 && b > 200) {
            backgroundR += r;
            backgroundG += g;
            backgroundB += b;
            validCorners++;
          }
        });
        
        if (validCorners > 0) {
          backgroundR = Math.round(backgroundR / validCorners);
          backgroundG = Math.round(backgroundG / validCorners);
          backgroundB = Math.round(backgroundB / validCorners);
          
          // Remove background color with tolerance
          const tolerance = 30;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Check if pixel is close to background color
            if (Math.abs(r - backgroundR) < tolerance &&
                Math.abs(g - backgroundG) < tolerance &&
                Math.abs(b - backgroundB) < tolerance) {
              data[i + 3] = 0; // Make transparent
            }
          }
          
          // Put the processed image data back
          ctx.putImageData(imageData, 0, 0);
        }
        
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
   * Check if an image likely has a white background that needs removal
   */
  static async hasWhiteBackground(imageUrl: string): Promise<boolean> {
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
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Sample edge pixels to check for white background
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let whitePixels = 0;
        let totalSampled = 0;
        
        // Sample edges
        for (let x = 0; x < canvas.width; x += 10) {
          // Top and bottom edges
          const topIndex = x * 4;
          const bottomIndex = ((canvas.height - 1) * canvas.width + x) * 4;
          
          [topIndex, bottomIndex].forEach(index => {
            if (index < data.length) {
              const r = data[index];
              const g = data[index + 1];
              const b = data[index + 2];
              
              if (r > 240 && g > 240 && b > 240) {
                whitePixels++;
              }
              totalSampled++;
            }
          });
        }
        
        for (let y = 0; y < canvas.height; y += 10) {
          // Left and right edges
          const leftIndex = (y * canvas.width) * 4;
          const rightIndex = (y * canvas.width + canvas.width - 1) * 4;
          
          [leftIndex, rightIndex].forEach(index => {
            if (index < data.length) {
              const r = data[index];
              const g = data[index + 1];
              const b = data[index + 2];
              
              if (r > 240 && g > 240 && b > 240) {
                whitePixels++;
              }
              totalSampled++;
            }
          });
        }
        
        // If more than 70% of edge pixels are white, likely has white background
        const whitePercentage = whitePixels / totalSampled;
        resolve(whitePercentage > 0.7);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }
}