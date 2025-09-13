// Pollinations.ai image generation service
export interface PollinationsImage {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
}

class PollinationsService {
  private readonly baseUrl = 'https://image.pollinations.ai/prompt';

  async generateImages(prompt: string, count: number = 3): Promise<PollinationsImage[]> {
    try {
      console.log('🌸 Generating images with Pollinations.ai for prompt:', prompt);
      
      const images: PollinationsImage[] = [];
      
      // Generate multiple images by adding variation to the prompt
      for (let i = 0; i < count; i++) {
        // Add slight variations to get different results
        const variations = [
          '',
          ', artistic style',
          ', creative design',
          ', vibrant colors',
          ', modern style',
          ', detailed artwork'
        ];
        
        const variation = variations[i % variations.length];
        const enhancedPrompt = `${prompt}${variation}`;
        
        // Pollinations.ai URL parameters for optimal t-shirt design
        const params = new URLSearchParams({
          width: '1024',
          height: '1024',
          seed: Math.floor(Math.random() * 1000000).toString(),
          enhance: 'true',
          nologo: 'true'
        });
        
        // Encode the prompt properly for URL
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const imageUrl = `${this.baseUrl}/${encodedPrompt}?${params.toString()}`;
        
        images.push({
          id: `pollinations_${Date.now()}_${i}`,
          imageUrl,
          title: `${prompt} Design ${i + 1}`,
          prompt: enhancedPrompt
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