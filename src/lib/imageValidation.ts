/**
 * Utility functions for detecting and handling mockup images
 */

/**
 * Check if an image URL appears to be a mockup image (contains a shirt)
 * This is a heuristic check based on common patterns in mockup image URLs
 */
export function isMockupImage(imageUrl: string): boolean {
  if (!imageUrl) return false;
  
  // Common patterns that indicate mockup images
  const mockupPatterns = [
    'mockup',
    'template',
    'shirt-template',
    'product-image',
    'preview',
    // Printify mockup image patterns
    'printify-upload-image-converter',
    'api.printify.com/mockup-generator',
    'printify.com',
    'printify-uploads',
    'mockup-generator',
    // If it contains "products" and looks like a Printify product URL
    '/products/',
    // Check for shirt-like image characteristics
    '.jpg', // Most mockups are JPGs
    '.jpeg',
  ];
  
  const url = imageUrl.toLowerCase();
  
  // If it's from Printify and contains product-related paths, likely a mockup
  if (url.includes('printify') && (url.includes('products') || url.includes('mockup'))) {
    return true;
  }
  
  // Count how many mockup patterns it matches
  const matchCount = mockupPatterns.filter(pattern => 
    url.includes(pattern.toLowerCase())
  ).length;
  
  // If it matches multiple patterns, likely a mockup
  return matchCount >= 2;
}

/**
 * Check if an image appears to be a design-only image (not a mockup)
 */
export function isDesignImage(imageUrl: string): boolean {
  if (!imageUrl) return false;
  
  // Patterns that indicate original design images
  const designPatterns = [
    'huggingface',
    'pollinations',
    'uploads/images', // Direct Printify uploads
    'blob:', // Browser blob URLs
    'data:', // Data URLs
    '/generated/', // Generated images
    '/designs/', // Design images
  ];
  
  return designPatterns.some(pattern => 
    imageUrl.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Validate that an image URL is safe to use for product creation
 * Returns an object with validation result and message
 */
export function validateImageForProductCreation(imageUrl: string): {
  isValid: boolean;
  message: string;
  imageType: 'design' | 'mockup' | 'unknown';
} {
  if (!imageUrl) {
    return {
      isValid: false,
      message: 'No image URL provided',
      imageType: 'unknown'
    };
  }
  
  if (isDesignImage(imageUrl)) {
    return {
      isValid: true,
      message: 'Valid design image',
      imageType: 'design'
    };
  }
  
  if (isMockupImage(imageUrl)) {
    return {
      isValid: false,
      message: 'Cannot use mockup image - would create "shirt on shirt" effect',
      imageType: 'mockup'
    };
  }
  
  return {
    isValid: true,
    message: 'Image type unknown but appears safe',
    imageType: 'unknown'
  };
}