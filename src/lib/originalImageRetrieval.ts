/**
 * Utility functions for retrieving original design images from Printify products
 */

interface PrintifyImageData {
  id: string;
  file_name: string;
  height: number;
  width: number;
  size: number;
  mime_type: string;
  preview_url: string;
  upload_time: string;
}

/**
 * Extract the original image ID from a Printify product's print_areas configuration
 */
export function extractOriginalImageId(product: any): string | null {
  try {
    if (!product?.print_areas || !Array.isArray(product.print_areas)) {
      console.log('🔍 No print_areas found in product');
      return null;
    }

    // Look through all print areas for placeholders with image IDs
    for (const printArea of product.print_areas) {
      if (printArea?.placeholders && Array.isArray(printArea.placeholders)) {
        for (const placeholder of printArea.placeholders) {
          if (placeholder?.images && Array.isArray(placeholder.images)) {
            for (const image of placeholder.images) {
              if (image?.id) {
                console.log('✅ Found image ID in print areas:', image.id);
                return image.id;
              }
            }
          }
        }
      }
    }

    console.log('⚠️ No image ID found in print areas');
    return null;
  } catch (error) {
    console.error('❌ Error extracting image ID:', error);
    return null;
  }
}

/**
 * Retrieve the original design image from Printify using the image ID
 */
export async function getOriginalImageByUploadId(imageId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/printify/uploads/${imageId}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch image ${imageId}:`, response.status);
      return null;
    }
    
    const imageData: PrintifyImageData = await response.json();
    
    // Return the preview_url which is the original uploaded image (not the processed/scaled version)
    if (imageData.preview_url) {
      console.log('✅ Retrieved original uploaded image URL:', imageData.preview_url);
      console.log('📋 Image details:', {
        filename: imageData.file_name,
        dimensions: `${imageData.width}x${imageData.height}`,
        size: `${Math.round(imageData.size / 1024)}KB`
      });
      return imageData.preview_url;
    }
    
    console.error('❌ No preview_url found in image data:', imageData);
    return null;
    
  } catch (error) {
    console.error('Error fetching original design image:', error);
    return null;
  }
}

/**
 * Get the original design image for a featured product by product ID
 */
export async function getOriginalDesignImage(productId: string): Promise<string | null> {
  try {
    console.log('🔍 Attempting to get original design image for product:', productId);

    // First, get detailed product information including print_areas
    const detailsResponse = await fetch(`/api/products/${productId}/details`);
    
    if (!detailsResponse.ok) {
      console.error('❌ Failed to fetch product details:', detailsResponse.status);
      return null;
    }

    const productDetails = await detailsResponse.json();
    console.log('📋 Got product details, extracting image ID...');

    // Extract the original image ID from print_areas
    const imageId = extractOriginalImageId(productDetails);
    
    if (!imageId) {
      console.log('⚠️ No image ID found in product details');
      return null;
    }

    console.log('🔍 Found image ID, fetching original image:', imageId);

    // Fetch the original image using the uploads endpoint
    const originalImageUrl = await getOriginalImageByUploadId(imageId);
    
    if (originalImageUrl) {
      console.log('✅ Retrieved original image URL');
      return originalImageUrl;
    }

    console.log('⚠️ Failed to retrieve original image');
    return null;

  } catch (error) {
    console.error('❌ Error getting original design image:', error);
    return null;
  }
}

/**
 * Get the original design image URL from a Printify product object
 * This combines extracting the image ID and retrieving the image data
 * @deprecated Use getOriginalDesignImage with product ID instead
 */
export async function getOriginalDesignFromProduct(product: any): Promise<string | null> {
  const imageId = extractOriginalImageId(product);
  
  if (!imageId) {
    console.warn('No original image ID found in product');
    return null;
  }
  
  console.log('Found original image ID:', imageId);
  return await getOriginalImageByUploadId(imageId);
}