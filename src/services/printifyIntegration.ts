// Simplified Printify integration for the core flow
export interface PrintifyVariant {
  id: number;
  title: string;
  options: {
    color: string;
    size: string;
  };
}

export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  images: Array<{
    src: string;
    alt: string;
  }>;
}

export interface OrderResponse {
  id: string;
  recipient: {
    name: string;
    email: string;
    phone: string;
    address: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      country: string;
      region: string;
      address1: string;
      address2?: string;
      city: string;
      zip: string;
    };
  };
  line_items: Array<{
    product_id: string;
    variant_id: number;
    quantity: number;
  }>;
  total_shipping: number;
  total_tax: number;
  total_cost: number;
}

class PrintifyIntegrationService {
  private readonly baseUrl = '/v1';

  // Step 1: Get available variants for a blueprint
  async getBlueprint6Variants(): Promise<PrintifyVariant[]> {
    try {
      const response = await fetch(`${this.baseUrl}/catalog/blueprints/6/print_providers/103/variants.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch variants: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Available variants:', data.variants?.length || 0);
      
      return data.variants || [];
    } catch (error) {
      console.error('❌ Error fetching variants:', error);
      throw error;
    }
  }

  // Step 2: Upload image to Printify
  async uploadImage(imageUrl: string, fileName: string = 'design.png'): Promise<string> {
    try {
      console.log('🔵 Starting image upload process...');
      
      // Try URL-based upload first (simpler approach)
      if (!imageUrl.startsWith('blob:')) {
        console.log('🔵 Attempting URL-based upload...');
        
        const urlUploadData = {
          file_name: fileName,
          url: imageUrl
        };

        const urlResponse = await fetch(`${this.baseUrl}/uploads/images.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(urlUploadData)
        });

        console.log('🔵 URL upload response status:', urlResponse.status);

        if (urlResponse.ok) {
          const urlData = await urlResponse.json();
          console.log('✅ URL-based upload successful:', urlData);
          return urlData.id;
        } else {
          const errorText = await urlResponse.text();
          console.warn('⚠️ URL upload failed, falling back to contents upload:', errorText);
        }
      }

      // Fall back to contents-based upload for blob URLs or if URL upload fails
      console.log('🔵 Attempting contents-based upload...');
      
      let imageBlob: Blob;
      
      if (imageUrl.startsWith('blob:')) {
        // For blob URLs, fetch the blob directly
        const blobResponse = await fetch(imageUrl);
        if (!blobResponse.ok) {
          throw new Error(`Failed to fetch blob: ${blobResponse.status}`);
        }
        imageBlob = await blobResponse.blob();
      } else {
        // For regular URLs, fetch the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        imageBlob = await imageResponse.blob();
      }

      console.log('🔵 Image blob details:', {
        size: imageBlob.size,
        type: imageBlob.type
      });

      // Validate image
      if (imageBlob.size === 0) {
        throw new Error('Image blob is empty');
      }

      if (!imageBlob.type.startsWith('image/')) {
        throw new Error(`Invalid image type: ${imageBlob.type}`);
      }

      // Check if image is too large (Printify has size limits)
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      if (imageBlob.size > maxSize) {
        throw new Error(`Image too large: ${imageBlob.size} bytes (max: ${maxSize})`);
      }

      // Use FileReader for base64 conversion (more reliable than manual conversion)
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64Content = result.split(',')[1];
          resolve(base64Content);
        };
        reader.onerror = () => reject(new Error('Failed to read image as base64'));
        reader.readAsDataURL(imageBlob);
      });
      
      const contentsUploadData = {
        file_name: fileName,
        contents: base64String
      };

      console.log('🔵 Uploading image with base64 contents...', {
        fileName,
        contentLength: base64String.length,
        contentSample: base64String.substring(0, 50) + '...'
      });

      const contentsResponse = await fetch(`${this.baseUrl}/uploads/images.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contentsUploadData)
      });

      console.log('🔵 Contents upload response status:', contentsResponse.status);

      if (!contentsResponse.ok) {
        const errorText = await contentsResponse.text();
        console.error('❌ Contents upload error details:', errorText);
        
        // Try to parse error response
        let errorDetails = errorText;
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = JSON.stringify(errorData, null, 2);
          console.error('❌ Parsed error data:', errorData);
        } catch (e) {
          // Keep original text if not JSON
        }
        
        throw new Error(`Failed to upload image: ${contentsResponse.status} ${contentsResponse.statusText}\nDetails: ${errorDetails}`);
      }

      const data = await contentsResponse.json();
      console.log('✅ Contents-based image upload successful:', data);
      
      if (!data.id) {
        throw new Error('Upload response missing image ID');
      }
      
      return data.id; // Return the uploaded image ID
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  }

  // Step 3: Create product with the uploaded design
  async createProduct(
    title: string,
    description: string,
    designImageId: string,
    variantId: number | string
  ): Promise<string> {
    try {
      console.log('🔵 Creating product with design...');
      
      // Ensure variantId is an integer
      const variantIdInt = parseInt(variantId.toString(), 10);
      if (isNaN(variantIdInt)) {
        throw new Error(`Invalid variant ID: ${variantId}`);
      }
      
      console.log('🔵 Using variant ID:', variantIdInt, 'for product creation');
      
      const productData = {
        title,
        description,
        blueprint_id: 6,
        print_provider_id: 103,
        variants: [
          {
            id: variantIdInt,
            price: 2499, // $24.99 in cents
            is_enabled: true
          }
        ],
        print_areas: [
          {
            variant_ids: [variantIdInt],
            placeholders: [
              {
                position: "front",
                images: [
                  {
                    id: designImageId,
                    x: 0.5,
                    y: 0.5,
                    scale: 1,
                    angle: 0
                  }
                ]
              }
            ]
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}/shops/24294177/products.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Product creation error:', errorText);
        throw new Error(`Failed to create product: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Product created successfully:', result);
      
      return result.id;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      throw error;
    }
  }

  // Step 4: Publish product (optional)
  async publishProduct(productId: string): Promise<void> {
    try {
      console.log('🔵 Publishing product...');
      
      const response = await fetch(`${this.baseUrl}/shops/24294177/products/${productId}/publish.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: true,
          description: true,
          images: true,
          variants: true,
          tags: true,
          keyFeatures: true,
          shipping_template: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('⚠️ Product publish warning:', errorText);
        // Don't throw error for publish failures, just log them
        return;
      }

      const result = await response.json();
      console.log('✅ Product published successfully:', result);
    } catch (error) {
      console.warn('⚠️ Error publishing product (non-critical):', error);
      // Don't rethrow publish errors
    }
  }

  // Combined flow: Create product from design
  async createProductFromDesign(
    designImageUrl: string,
    title: string,
    description: string,
    variantId: number | string
  ): Promise<PrintifyProduct> {
    try {
      console.log('🚀 Starting product creation flow...');
      
      // Step 1: Upload the design image
      const imageId = await this.uploadImage(designImageUrl);
      console.log('✅ Image uploaded with ID:', imageId);
      
      // Step 2: Create the product
      const productId = await this.createProduct(title, description, imageId, variantId);
      console.log('✅ Product created with ID:', productId);
      // Product is created but NOT published
      
      // Step 4: Get product details to return
      const productDetails = await this.getProductDetails(productId);
      
      console.log('🎉 Product creation flow completed successfully!');
      return productDetails;
      
    } catch (error) {
      console.error('❌ Product creation flow failed:', error);
      throw error;
    }
  }

  // Get product details after creation
  async getProductDetails(productId: string): Promise<PrintifyProduct> {
    try {
      const response = await fetch(`${this.baseUrl}/shops/24294177/products/${productId}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch product details: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform the response to our interface format
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        images: data.images || []
      };
    } catch (error) {
      console.error('❌ Error fetching product details:', error);
      throw error;
    }
  }

  // Place order for the created product
  async placeOrder(
    productId: string,
    variantId: number,
    quantity: number,
    shippingAddress: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      country: string;
      region: string;
      address1: string;
      address2?: string;
      city: string;
      zip: string;
    }
  ): Promise<OrderResponse> {
    try {
      console.log('🔵 Placing order...');
      
      const orderData = {
        external_id: `order-${Date.now()}`,
        line_items: [
          {
            product_id: productId,
            variant_id: variantId,
            quantity: quantity
          }
        ],
        shipping_method: 1,
        is_printify_express: false,
        send_shipping_notification: false,
        address_to: shippingAddress
      };

      const response = await fetch(`${this.baseUrl}/shops/24294177/orders.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Order placement error:', errorText);
        throw new Error(`Failed to place order: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Order placed successfully:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error placing order:', error);
      throw error;
    }
  }

  // Clean up: Delete product after order is placed
  async deleteProduct(productId: string): Promise<void> {
    try {
      console.log('🔵 Cleaning up product...');
      
      const response = await fetch(`${this.baseUrl}/shops/24294177/products/${productId}.json`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to delete product:', response.status);
        return;
      }

      console.log('✅ Product deleted successfully');
    } catch (error) {
      console.warn('⚠️ Error deleting product (non-critical):', error);
      // Don't rethrow delete errors
    }
  }
}

// Export singleton instance
export const printifyIntegration = new PrintifyIntegrationService();