import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client
const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_TOKEN);

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
}

/**
 * Generate images using Hugging Face Stable Diffusion model
 * Optimized for Printify compatibility with high-resolution output
 * @param prompt - The text prompt for image generation
 * @param count - Number of images to generate (default: 3)
 * @returns Array of generated images with metadata
 */
export async function generateImages(prompt: string, count: number = 3): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];
  
  try {
    // Generate multiple images by calling the API multiple times
    const promises = Array.from({ length: count }, async (_, index) => {
      // Add some variation to each prompt for diverse results with print optimization
      const variations = [
        `${prompt}, high quality t-shirt design, vector art style, clean background`,
        `${prompt}, artistic print design, bold colors, high contrast`,
        `${prompt}, vibrant t-shirt graphic, modern design, crisp details`,
        `${prompt}, detailed illustration for apparel, professional quality`,
        `${prompt}, contemporary design, minimalist style, print-ready artwork`
      ];
      
      const variatedPrompt = variations[index % variations.length];
      
      try {
        // Use Stable Diffusion XL model for high-quality image generation
        const response = await hf.textToImage({
          model: 'stabilityai/stable-diffusion-xl-base-1.0',
          inputs: variatedPrompt,
          parameters: {
            guidance_scale: 9.0, // Increased for better quality
            num_inference_steps: 50, // Increased for higher quality
            width: 1024, // Increased resolution for print quality
            height: 1024, // Square format suitable for t-shirt designs
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