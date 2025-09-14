// Pollinations.ai image generation service
import { getAspectRatioDimensions } from '@/lib/utils';
import type { ImageShape, AspectRatio } from '@/lib/utils';
import { SmartImageProcessor } from './smartImageProcessor';

export interface PollinationsImage {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
  originalPrompt?: string; // Store original user prompt for cleaner display
  shape: ImageShape;
  aspectRatio: AspectRatio;
}

class PollinationsService {
  private readonly baseUrl = 'https://image.pollinations.ai/prompt';
  // Smart background removal to handle white backgrounds without clipping designs
  private readonly useSmartBackgroundRemoval = true;

  /**
   * Generate shape-specific prompt enhancement based on the selected shape
   */
  private getShapePromptEnhancement(shape: ImageShape): string {
    switch (shape) {
      case 'circle':
        return ', naturally circular composition, round design that fills a circle, circular layout, radial symmetry, centered in circle, transparent background, no white background, isolated design';
      case 'triangle':
        return ', triangular composition, design arranged in triangle shape, triangular layout, fits naturally in triangle frame, pyramid arrangement, transparent background, no white background, isolated design';
      case 'oval':
        return ', oval composition, elliptical design layout, naturally fits oval shape, oval arrangement, elliptical symmetry, transparent background, no white background, isolated design';
      case 'diamond':
        return ', diamond composition, rhombus layout, design arranged in diamond shape, diamond symmetry, fits diamond frame naturally, transparent background, no white background, isolated design';
      case 'hexagon':
        return ', hexagonal composition, six-sided layout, design fits hexagon shape naturally, hexagonal symmetry, geometric hexagon arrangement, transparent background, no white background, isolated design';
      case 'rectangle':
        return ', rectangular composition, horizontal banner layout, wide rectangular design, landscape orientation, transparent background, no white background, isolated design';
      case 'square':
      default:
        return ', square composition, centered square layout, balanced square design, fits square frame naturally, transparent background, no white background, isolated design';
    }
  }

  /**
   * Generate aspect ratio specific prompt enhancement
   */
  private getAspectRatioPromptEnhancement(aspectRatio: AspectRatio): string {
    switch (aspectRatio) {
      case '16:9':
        return ', wide banner style, horizontal layout, panoramic design, landscape orientation';
      case '9:16':
        return ', vertical banner style, tall design, portrait orientation, vertical layout';
      case '4:3':
        return ', classic rectangular format, standard proportions, balanced rectangular design';
      case '1:1':
      default:
        return ', square format, balanced proportions, centered design';
    }
  }

  async generateImages(
    prompt: string, 
    shape: ImageShape = 'square', 
    aspectRatio: AspectRatio = '1:1',
    count: number = 3
  ): Promise<PollinationsImage[]> {
    try {
      console.log('🌸 Generating images with Pollinations.ai for prompt:', prompt, 'shape:', shape, 'aspectRatio:', aspectRatio);
      
      const images: PollinationsImage[] = [];
      
      // Get dimensions based on aspect ratio
      const dimensions = getAspectRatioDimensions(aspectRatio, 1024);
      
      // Generate multiple images by adding variation to the prompt
      for (let i = 0; i < count; i++) {
        // Add slight variations to get different results
        const baseVariations = [
          ', artistic style',
          ', creative design',
          ', vibrant colors',
          ', modern style',
          ', detailed artwork',
          ', professional quality'
        ];
        
        const baseVariation = baseVariations[i % baseVariations.length];
        const shapeEnhancement = this.getShapePromptEnhancement(shape);
        const ratioEnhancement = this.getAspectRatioPromptEnhancement(aspectRatio);
        
        // Combine all enhancements for a comprehensive prompt
        const enhancedPrompt = `${prompt}${baseVariation}${shapeEnhancement}${ratioEnhancement}, high quality t-shirt design, clean composition, professional artwork, PNG with transparency, cutout style, no background`;
        
        console.log(`🎨 Enhanced prompt for ${shape} ${aspectRatio}:`, enhancedPrompt);
        
        // Pollinations.ai URL parameters for optimal t-shirt design
        const params = new URLSearchParams({
          width: dimensions.width.toString(),
          height: dimensions.height.toString(),
          seed: Math.floor(Math.random() * 1000000).toString(),
          enhance: 'true',
          nologo: 'true'
        });
        
        // Encode the prompt properly for URL
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        let imageUrl = `${this.baseUrl}/${encodedPrompt}?${params.toString()}`;
        
        // Apply smart background removal if enabled
        if (this.useSmartBackgroundRemoval) {
          try {
            console.log(`🧹 Checking for white background removal...`);
            const hasWhiteBg = await SmartImageProcessor.hasWhiteBackground(imageUrl);
            
            if (hasWhiteBg) {
              console.log(`🎨 Removing white background from ${shape} image...`);
              imageUrl = await SmartImageProcessor.removeBackgroundSmart(imageUrl);
              console.log(`✅ Successfully removed background from ${shape} image`);
            } else {
              console.log(`✅ No background removal needed for ${shape} image`);
            }
          } catch (error) {
            console.warn(`⚠️ Background removal failed, using original image:`, error);
            // Fall back to original image if processing fails
          }
        }
        
        images.push({
          id: `pollinations_${Date.now()}_${i}`,
          imageUrl,
          title: `${prompt} Design ${i + 1}`,
          prompt: enhancedPrompt,
          originalPrompt: prompt, // Store original user prompt
          shape,
          aspectRatio,
        });
        
        // Small delay between requests to be respectful
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('✅ Pollinations.ai generated', images.length, 'images');
      return images;
      
    } catch (error) {
      console.error('❌ Error generating images with Pollinations.ai:', error);
      throw new Error('Failed to generate images with Pollinations.ai');
    }
  }
}

// Cleanup function (no cleanup needed for Pollinations URLs)
export function cleanupPollinationsImages(images: PollinationsImage[]): void {
  // Pollinations URLs are direct links, no cleanup needed
  console.log('🧹 Pollinations images cleanup (no action needed)');
}

export const pollinationsService = new PollinationsService();