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