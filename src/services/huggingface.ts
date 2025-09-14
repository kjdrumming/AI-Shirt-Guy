import { HfInference } from '@huggingface/inference';
import { getAspectRatioDimensions } from '@/lib/utils';
import type { ImageShape, AspectRatio } from '@/lib/utils';

// Initialize Hugging Face client
const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_TOKEN);

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
  originalPrompt?: string; // Store original user prompt for cleaner display
  shape: ImageShape;
  aspectRatio: AspectRatio;
}

/**
 * Generate shape-specific prompt enhancement based on the selected shape
 */
function getShapePromptEnhancement(shape: ImageShape): string {
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
function getAspectRatioPromptEnhancement(aspectRatio: AspectRatio): string {
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

/**
 * Generate images using Hugging Face Stable Diffusion model
 * Optimized for Printify compatibility with high-resolution output
 * @param prompt - The text prompt for image generation
 * @param shape - The desired shape for the image
 * @param aspectRatio - The desired aspect ratio
 * @param count - Number of images to generate (default: 3)
 * @returns Array of generated images with metadata
 */
export async function generateImages(
  prompt: string, 
  shape: ImageShape = 'square', 
  aspectRatio: AspectRatio = '1:1',
  count: number = 3
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];
  
  try {
    // Get dimensions based on aspect ratio
    const dimensions = getAspectRatioDimensions(aspectRatio, 1024);
    
    // Generate multiple images by calling the API multiple times
    const promises = Array.from({ length: count }, async (_, index) => {
      // Add some variation to each prompt for diverse results with print optimization
      const baseVariations = [
        ', high quality t-shirt design, vector art style',
        ', artistic print design, bold colors, high contrast',
        ', vibrant t-shirt graphic, modern design, crisp details', 
        ', detailed illustration for apparel, professional quality',
        ', contemporary design, minimalist style, print-ready artwork'
      ];
      
      const baseVariation = baseVariations[index % baseVariations.length];
      const shapeEnhancement = getShapePromptEnhancement(shape);
      const ratioEnhancement = getAspectRatioPromptEnhancement(aspectRatio);
      
      // Combine all enhancements for a comprehensive prompt
      const variatedPrompt = `${prompt}${baseVariation}${shapeEnhancement}${ratioEnhancement}, high quality t-shirt design, clean composition, professional artwork, PNG with transparency, cutout style, no background`;
      
      console.log(`🤖 Enhanced HF prompt for ${shape} ${aspectRatio}:`, variatedPrompt);
      
      try {
        // Use Stable Diffusion XL model for high-quality image generation
        const response = await hf.textToImage({
          model: 'stabilityai/stable-diffusion-xl-base-1.0',
          inputs: variatedPrompt,
          parameters: {
            guidance_scale: 9.0, // Increased for better quality
            num_inference_steps: 50, // Increased for higher quality
            width: dimensions.width, // Dynamic width based on aspect ratio
            height: dimensions.height, // Dynamic height based on aspect ratio
          }
        });

        // Handle different response types from Hugging Face API
        let imageUrl: string;
        if (typeof response === 'string') {
          // If response is a data URL or URL string
          imageUrl = response;
        } else {
          // If response is a Blob
          imageUrl = URL.createObjectURL(response as unknown as Blob);
        }
        
        return {
          id: `generated-${Date.now()}-${index}`,
          imageUrl,
          title: generateTitle(prompt, index),
          prompt: variatedPrompt,
          originalPrompt: prompt, // Store original user prompt
          shape,
          aspectRatio,
        };
      } catch (error) {
        console.error(`Error generating image ${index + 1}:`, error);
        throw error;
      }
    });

    const generatedImages = await Promise.all(promises);
    results.push(...generatedImages.filter(Boolean));
    
  } catch (error) {
    console.error('Error in generateImages:', error);
    throw new Error('Failed to generate images. Please try again.');
  }

  return results;
}

/**
 * Generate a creative title based on the prompt
 */
function generateTitle(prompt: string, index: number): string {
  const words = prompt.toLowerCase().split(' ');
  const adjectives = ['Creative', 'Artistic', 'Modern', 'Vibrant', 'Abstract', 'Bold', 'Elegant', 'Dynamic'];
  const nouns = ['Design', 'Art', 'Creation', 'Masterpiece', 'Vision', 'Expression'];
  
  // Try to extract meaningful words from prompt
  const meaningfulWords = words.filter(word => 
    word.length > 3 && 
    !['with', 'and', 'the', 'that', 'this', 'from', 'for'].includes(word)
  );
  
  if (meaningfulWords.length > 0) {
    const baseWord = meaningfulWords[0];
    const adjective = adjectives[index % adjectives.length];
    return `${adjective} ${baseWord.charAt(0).toUpperCase() + baseWord.slice(1)}`;
  }
  
  // Fallback to generic names
  const adjective = adjectives[index % adjectives.length];
  const noun = nouns[index % nouns.length];
  return `${adjective} ${noun}`;
}

/**
 * Clean up blob URLs to prevent memory leaks
 */
export function cleanupImageUrls(images: GeneratedImage[]): void {
  images.forEach(image => {
    if (image.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(image.imageUrl);
    }
  });
}