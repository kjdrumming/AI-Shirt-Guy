/**
 * Dynamic Product Creation Service
 * 
 * This service handles creating new Printify products on-demand when users
 * place orders with custom size/color combinations for featured products.
 */

const fetch = require('node-fetch');

class DynamicProductService {
  constructor() {
    this.apiToken = process.env.PRINTIFY_API_TOKEN;
    this.shopId = '24294177'; // AI-Shirt-Guy shop
  }

  /**
   * Create a new product based on a featured product template with custom variants
   * @param {string} templateProductId - The featured product to use as template
   * @param {Object} selectedVariant - The variant selected by the user
   * @param {string} customerEmail - Customer email for product naming
   * @returns {Promise<Object>} - The created product details
   */
  async createCustomProduct(templateProductId, selectedVariant, customerEmail = 'customer') {
    try {
      console.log('🎨 Creating custom product from template:', templateProductId);
      
      // First, get the template product details
      const templateProduct = await this.getProductDetails(templateProductId);
      if (!templateProduct) {
        throw new Error('Template product not found');
      }

      // Extract the design/image from the template
      const designImage = templateProduct.images?.[0];
      if (!designImage) {
        throw new Error('No design image found in template product');
      }

      // Create a new product with the selected variant
      const customProduct = await this.createProduct(templateProduct, selectedVariant, customerEmail);
      
      console.log('✅ Custom product created successfully:', customProduct.id);
      return customProduct;

    } catch (error) {
      console.error('❌ Error creating custom product:', error);
      throw error;
    }
  }

  /**
   * Get detailed product information from Printify
   * @param {string} productId - The product ID
   * @returns {Promise<Object|null>} - Product details or null
   */
  async getProductDetails(productId) {
    try {
      const response = await fetch(
        `https://api.printify.com/v1/shops/${this.shopId}/products/${productId}.json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch product details:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching product details:', error);
      return null;
    }
  }

  /**
   * Create a new product in Printify
   * @param {Object} templateProduct - The template product data
   * @param {Object} selectedVariant - The selected variant
   * @param {string} customerEmail - Customer identifier
   * @returns {Promise<Object>} - Created product
   */
  async createProduct(templateProduct, selectedVariant, customerEmail) {
    try {
      // Generate a unique title for the custom product
      const timestamp = Date.now();
      const variantName = `${selectedVariant.options.size}-${selectedVariant.options.color}`.toLowerCase();
      const customTitle = `${templateProduct.title} - ${variantName} - ${timestamp}`;

      // Prepare the product creation payload
      const productData = {
        title: customTitle,
        description: `Custom order: ${templateProduct.title} in ${selectedVariant.options.size} ${selectedVariant.options.color}`,
        blueprint_id: templateProduct.blueprint_id,
        print_provider_id: templateProduct.print_provider_id,
        variants: [
          {
            id: selectedVariant.id,
            price: selectedVariant.price,
            is_enabled: true
          }
        ],
        print_areas: templateProduct.print_areas || [],
        // Use the same images from the template
        images: templateProduct.images || []
      };

      console.log('📦 Creating product with data:', {
        title: customTitle,
        blueprint_id: productData.blueprint_id,
        print_provider_id: productData.print_provider_id,
        variant_id: selectedVariant.id
      });

      const response = await fetch(
        `https://api.printify.com/v1/shops/${this.shopId}/products.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to create product:', response.status, errorData);
        throw new Error(`Failed to create product: ${response.status} - ${errorData}`);
      }

      const createdProduct = await response.json();
      console.log('✅ Product created with ID:', createdProduct.id);
      
      return createdProduct;

    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Publish a product to make it available for purchase
   * @param {string} productId - The product ID to publish
   * @returns {Promise<boolean>} - Success status
   */
  async publishProduct(productId) {
    try {
      const response = await fetch(
        `https://api.printify.com/v1/shops/${this.shopId}/products/${productId}/publish.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: true,
            description: true,
            images: true,
            variants: true,
            tags: true
          })
        }
      );

      if (!response.ok) {
        console.error('Failed to publish product:', response.status);
        return false;
      }

      console.log('✅ Product published successfully:', productId);
      return true;

    } catch (error) {
      console.error('Error publishing product:', error);
      return false;
    }
  }

  /**
   * Create order for a custom product
   * @param {string} productId - The custom product ID
   * @param {Object} shippingAddress - Customer shipping address
   * @param {string} customerEmail - Customer email
   * @returns {Promise<Object>} - Order details
   */
  async createOrder(productId, shippingAddress, customerEmail) {
    try {
      console.log('📋 Creating order for product:', productId);

      const orderData = {
        external_id: `order_${Date.now()}`,
        line_items: [
          {
            product_id: productId,
            variant_id: null, // Will be determined by Printify
            quantity: 1
          }
        ],
        shipping_method: 1, // Standard shipping
        send_shipping_notification: true,
        address_to: {
          first_name: shippingAddress.firstName,
          last_name: shippingAddress.lastName,
          email: customerEmail,
          phone: shippingAddress.phone || '',
          country: shippingAddress.country,
          region: shippingAddress.state,
          address1: shippingAddress.address1,
          address2: shippingAddress.address2 || '',
          city: shippingAddress.city,
          zip: shippingAddress.zipCode
        }
      };

      const response = await fetch(
        `https://api.printify.com/v1/shops/${this.shopId}/orders.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to create order:', response.status, errorData);
        throw new Error(`Failed to create order: ${response.status} - ${errorData}`);
      }

      const order = await response.json();
      console.log('✅ Order created successfully:', order.id);
      
      return order;

    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Create an admin test product from scratch with AI-generated design
   * @param {Object} params - Product creation parameters
   * @param {string} params.designUrl - URL of the AI-generated design
   * @param {string} params.shirtTemplate - Shirt template (white, black, navy)
   * @param {string} params.prompt - Original AI prompt
   * @param {number} params.blueprintId - Printify blueprint ID
   * @param {number} params.printProviderId - Printify print provider ID
   * @param {number} params.price - Product price in cents
   * @param {number} params.variantId - Variant ID for the product
   * @param {string} params.shape - Image shape (square, circle, etc.)
   * @param {string} params.aspectRatio - Aspect ratio (1:1, 16:9, etc.)
   * @returns {Promise<Object>} - The created product details
   */
  async createAdminProduct(params) {
    try {
      const { designUrl, shirtTemplate, prompt, blueprintId, printProviderId, price, variantId, shape = 'square', aspectRatio = '1:1' } = params;
      
      console.log('🎨 Creating admin test product with:', {
        shirtTemplate,
        blueprintId,
        printProviderId,
        variantId,
        shape,
        aspectRatio,
        prompt: prompt?.substring(0, 50) + '...'
      });

      // Upload the design image to Printify
      const uploadedImage = await this.uploadImage(designUrl);
      
      // Use the provided variant ID or default to 1
      const selectedVariantId = variantId || 1;
      
      // Calculate proper positioning based on shape and aspect ratio
      const positioning = this.calculatePrintifyPositioning(shape, aspectRatio);
      
      // Create product payload
      const productPayload = {
        title: `AI Design - ${prompt?.substring(0, 30) || 'Custom Design'}`,
        description: `AI-generated design created from prompt: "${prompt || 'Custom design'}"`,
        blueprint_id: blueprintId,
        print_provider_id: printProviderId,
        variants: [
          {
            id: selectedVariantId,
            price: price || 2499,
            is_enabled: true
          }
        ],
        print_areas: [
          {
            variant_ids: [selectedVariantId],
            placeholders: [
              {
                position: 'front',
                images: [
                  {
                    id: uploadedImage.id,
                    x: positioning.x,
                    y: positioning.y,
                    scale: positioning.scale,
                    angle: positioning.angle
                  }
                ]
              }
            ]
          }
        ]
      };

      // Create the product
      const response = await fetch(`https://api.printify.com/v1/shops/${this.shopId}/products.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create product: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const product = await response.json();
      
      // Don't publish admin products automatically - they should remain as drafts
      // Admin can manually publish them from the Printify dashboard if needed
      
      console.log('✅ Admin test product created (unpublished):', product.id);
      return { product };

    } catch (error) {
      console.error('❌ Error creating admin product:', error);
      throw error;
    }
  }

  /**
   * Calculate Printify positioning coordinates based on shape and aspect ratio
   * Same logic as the frontend positioning system
   */
  calculatePrintifyPositioning(shape, aspectRatio) {
    // Base positioning - higher on chest area
    let x = 0.5; // Always center horizontally
    let y = 0.3; // Higher positioning (was 0.5 center)
    let scale = 0.8; // Base scale

    // Adjust positioning based on shape
    switch (shape) {
      case 'circle':
        scale = 0.7; // Slightly smaller to ensure the circle fits well
        break;
      
      case 'triangle':
        y = 0.32; // Slightly lower to account for triangle shape
        scale = 0.75;
        break;
      
      case 'oval':
        scale = 0.75;
        break;
      
      case 'diamond':
        scale = 0.7;
        break;
      
      case 'hexagon':
        scale = 0.75;
        break;
      
      case 'rectangle':
        scale = 0.8;
        break;
      
      case 'square':
      default:
        scale = 0.8;
        break;
    }

    // Adjust scale based on aspect ratio
    switch (aspectRatio) {
      case '16:9':
        scale *= 0.85; // Wide designs - smaller to fit
        break;
      
      case '9:16':
        scale *= 0.9; // Tall designs - can be larger vertically
        y = 0.35; // Move down slightly for tall designs
        break;
      
      case '4:3':
        scale *= 0.9; // Slightly wider than square
        break;
      
      case '1:1':
      default:
        // Square - use base scale
        break;
    }

    return {
      x,
      y,
      scale,
      angle: 0 // No rotation
    };
  }

  /**
   * Upload an image from URL to Printify
   * @param {string} imageUrl - URL of the image to upload
   * @returns {Promise<Object>} - Upload result with image ID
   */
  async uploadImage(imageUrl) {
    try {
      console.log('📤 Starting image upload process to Printify:', imageUrl);
      console.log('🔑 API Token present:', !!this.apiToken);
      
      // Try URL-based upload first (simpler approach)
      if (!imageUrl.startsWith('blob:')) {
        console.log('🔵 Attempting URL-based upload...');
        
        const urlUploadData = {
          file_name: `ai_design_${Date.now()}.png`,
          url: imageUrl
        };

        console.log('📦 URL upload payload:', JSON.stringify(urlUploadData, null, 2));

        const urlResponse = await fetch(`https://api.printify.com/v1/uploads/images.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(urlUploadData)
        });

        console.log('📊 URL upload response status:', urlResponse.status, urlResponse.statusText);

        if (urlResponse.ok) {
          const urlData = await urlResponse.json();
          console.log('✅ URL-based upload successful:', urlData);
          return urlData;
        } else {
          const errorText = await urlResponse.text();
          console.warn('⚠️ URL upload failed, falling back to contents upload:', errorText);
        }
      }

      // Fall back to contents-based upload for blob URLs or if URL upload fails
      console.log('🔵 Attempting contents-based upload...');
      
      // Fetch the image (only if it's an actual URL, not a data URL)
      let imageBuffer;
      if (imageUrl.startsWith('data:')) {
        // Handle data URLs - extract base64 content
        const base64Data = imageUrl.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // Handle regular URLs - fetch the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        imageBuffer = await imageResponse.buffer();
      }
      
      console.log('🔵 Image buffer details:', {
        size: imageBuffer.length,
        type: imageUrl.startsWith('data:') ? 'data URL' : 'fetched from URL'
      });

      // Validate image
      if (imageBuffer.length === 0) {
        throw new Error('Image buffer is empty');
      }

      // Check if image is too large (Printify has size limits)
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      if (imageBuffer.length > maxSize) {
        throw new Error(`Image too large: ${imageBuffer.length} bytes (max: ${maxSize})`);
      }

      // Convert buffer to base64 string (Node.js way)
      const base64String = imageBuffer.toString('base64');
      
      const contentsUploadData = {
        file_name: `ai_design_${Date.now()}.png`,
        contents: base64String
      };

      console.log('🔵 Uploading image with base64 contents...', {
        fileName: contentsUploadData.file_name,
        contentLength: base64String.length,
        contentSample: base64String.substring(0, 50) + '...'
      });

      const contentsResponse = await fetch(`https://api.printify.com/v1/uploads/images.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contentsUploadData)
      });

      console.log('📊 Contents upload response status:', contentsResponse.status, contentsResponse.statusText);

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
      
      return data; // Return the full upload result
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Full workflow: Create custom product and place order
   * @param {string} templateProductId - Featured product template
   * @param {Object} selectedVariant - User-selected variant
   * @param {Object} shippingAddress - Shipping details
   * @param {string} customerEmail - Customer email
   * @returns {Promise<Object>} - Order and product details
   */
  async createAndOrder(templateProductId, selectedVariant, shippingAddress, customerEmail) {
    try {
      console.log('🚀 Starting full custom product workflow...');
      
      // Step 1: Create custom product
      const customProduct = await this.createCustomProduct(templateProductId, selectedVariant, customerEmail);
      
      // Step 2: Publish the product
      await this.publishProduct(customProduct.id);
      
      // Step 3: Create order
      const order = await this.createOrder(customProduct.id, shippingAddress, customerEmail);
      
      return {
        product: customProduct,
        order: order,
        success: true
      };

    } catch (error) {
      console.error('❌ Full workflow failed:', error);
      throw error;
    }
  }
}

module.exports = DynamicProductService;