export interface StockImage {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
}

/**
 * Generate stock placeholder images using Picsum
 * @param prompt - The text prompt for generating themed stock images
 * @param count - Number of images to generate (default: 3)
 * @returns Array of stock images with metadata
 */
export async function generateStockImages(prompt: string, count: number = 3): Promise<StockImage[]> {
  const results: StockImage[] = [];
  
  try {
    // Create stock images with different IDs for variety
    const imageIds = [237, 1024, 433, 225, 348, 164, 582, 139, 420, 274]; // Curated nice Picsum image IDs
    
    for (let i = 0; i < count; i++) {
      const imageId = imageIds[i % imageIds.length];
      const imageUrl = `https://picsum.photos/id/${imageId}/512/512`;
      
      results.push({
        id: `stock-${Date.now()}-${i}`,
        imageUrl,
        title: generateStockTitle(prompt, i),
        prompt: `Stock design inspired by: ${prompt}`,
      });
    }
    
    // Simulate some delay to make it feel more realistic
    await new Promise(resolve => setTimeout(resolve, 800));
    
  } catch (error) {
    console.error('Error generating stock images:', error);
    throw new Error('Failed to generate stock images. Please try again.');
  }

  return results;
}

/**
 * Generate a creative title for stock images based on the prompt
 */
function generateStockTitle(prompt: string, index: number): string {
  const words = prompt.toLowerCase().split(' ');
  const stockAdjectives = ['Curated', 'Classic', 'Premium', 'Stylish', 'Trendy', 'Modern', 'Elegant', 'Artistic'];
  const stockNouns = ['Collection', 'Design', 'Style', 'Pattern', 'Template', 'Artwork'];
  
  // Try to extract meaningful words from prompt
  const meaningfulWords = words.filter(word => 
    word.length > 3 && 
    !['with', 'and', 'the', 'that', 'this', 'from', 'for', 'stock', 'image'].includes(word)
  );
  
  if (meaningfulWords.length > 0) {
    const baseWord = meaningfulWords[0];
    const adjective = stockAdjectives[index % stockAdjectives.length];
    return `${adjective} ${baseWord.charAt(0).toUpperCase() + baseWord.slice(1)}`;
  }
  
  // Fallback to generic names
  const adjective = stockAdjectives[index % stockAdjectives.length];
  const noun = stockNouns[index % stockNouns.length];
  return `${adjective} ${noun}`;
}

/**
 * No cleanup needed for stock images since they're external URLs
 */
export function cleanupStockImages(images: StockImage[]): void {
  // No cleanup needed for external URLs
  console.log(`No cleanup required for ${images.length} stock images`);
}