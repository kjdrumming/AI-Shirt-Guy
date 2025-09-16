const express = require('express');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const DynamicProductService = require('../services/dynamicProductService');

const router = express.Router();
const dynamicProductService = new DynamicProductService();

// Create cache instance (cache products for 10 minutes, rate limit cache for 1 minute)
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes for products
  checkperiod: 60,
  useClones: false
});

// Rate limiting cache - tracks when last API calls were made
const rateLimitCache = new NodeCache({
  stdTTL: 60, // 1 minute
  checkperiod: 10,
  useClones: false
});

// Path to admin config file
const CONFIG_FILE_PATH = path.join(__dirname, '../data/adminConfig.json');

// Function to load admin config
function loadAdminConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('❌ Error loading admin config:', error);
  }
  return { featuredProducts: [] };
}

/**
 * Get all shops for the authenticated user
 */
router.get('/shops', async (req, res) => {
  try {
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    // Check cache first
    const cacheKey = 'shops';
    const cachedShops = cache.get(cacheKey);
    if (cachedShops) {
      console.log('💾 Cache HIT for shops');
      return res.json(cachedShops);
    }

    console.log('🏪 Fetching shops from Printify API...');
    
    const response = await fetch('https://api.printify.com/v1/shops.json', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Creative-Shirt-Maker/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Printify API error (shops):', response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: response.headers.get('retry-after') || 60
        });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch shops: ${response.status}` 
      });
    }

    const data = await response.json();
    
    // Cache the shops for 5 minutes
    cache.set(cacheKey, data, 300);
    
    console.log(`✅ Successfully fetched ${data?.length || 0} shops`);
    res.json(data);

  } catch (error) {
    console.error('❌ Error fetching shops:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching shops',
      details: error.message 
    });
  }
});

/**
 * Get top 5 published products from a specific shop
 */
router.get('/shops/:shopId/top-products', async (req, res) => {
  try {
    const { shopId } = req.params;
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    if (!shopId || shopId === 'undefined') {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    // Check cache first
    const cacheKey = `top-products-${shopId}`;
    const cachedProducts = cache.get(cacheKey);
    if (cachedProducts) {
      console.log(`💾 Cache HIT for top products (shop: ${shopId})`);
      return res.json(cachedProducts);
    }

    console.log(`🛍️ Fetching products from shop ${shopId}...`);
    
    // Fetch products with limit of 50 (API max) to get a good selection
    const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json?limit=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Creative-Shirt-Maker/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printify API error (products for shop ${shopId}):`, response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: response.headers.get('retry-after') || 60
        });
      }
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch products: ${response.status}` 
      });
    }

    const data = await response.json();
    const products = data.data || [];
    
    console.log(`📦 Found ${products.length} total products in shop ${shopId}`);
    
    // Filter for published/visible products and get top 5
    const publishedProducts = products
      .filter(product => product.visible === true) // Only published/visible products
      .slice(0, 5) // Take top 5
      .map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        created_at: product.created_at,
        visible: product.visible,
        // Get the first default image or first available image
        image: product.images?.find(img => img.is_default) || product.images?.[0] || null,
        // Get price from first enabled variant
        price: product.variants?.find(variant => variant.is_enabled)?.price || null,
        // Include variant info for pricing display
        variants: product.variants?.filter(variant => variant.is_enabled).map(variant => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          is_default: variant.is_default
        })) || []
      }));
    
    console.log(`✅ Found ${publishedProducts.length} published products, returning top 5`);
    
    const result = {
      data: publishedProducts,
      total: publishedProducts.length,
      shop_id: shopId
    };
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, result, 300);
    
    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching top products:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching products',
      details: error.message 
    });
  }
});

/**
 * Get the AI-Shirt-Guy shop ID (hardcoded to specific shop)
 */
router.get('/first-shop', async (req, res) => {
  try {
    // Return hardcoded shop ID for AI-Shirt-Guy
    const result = {
      id: 24294177,
      title: "AI-Shirt-Guy",
      sales_channel: "custom_integration"
    };
    
    console.log(`✅ Using AI-Shirt-Guy shop: ${result.title} (ID: ${result.id})`);
    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching shop:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching shop',
      details: error.message 
    });
  }
});

/**
 * Get all published products from AI-Shirt-Guy shop for admin selection
 */
router.get('/all-products', async (req, res) => {
  try {
    const shopId = 24294177; // AI-Shirt-Guy shop ID
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    const forceRefresh = req.query.refresh === 'true'; // Allow cache busting
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    // Check cache first (unless force refresh is requested)
    const cacheKey = `all-products-${shopId}`;
    const rateLimitKey = `rate-limit-all-products-${shopId}`;
    
    if (!forceRefresh) {
      const cachedProducts = cache.get(cacheKey);
      if (cachedProducts) {
        console.log(`💾 Cache HIT for all products (shop: ${shopId})`);
        return res.json(cachedProducts);
      }
    } else {
      // Check if we're being rate limited (prevent rapid refreshes)
      const lastApiCall = rateLimitCache.get(rateLimitKey);
      console.log(`🔍 Checking rate limit - Last API call: ${lastApiCall ? new Date(lastApiCall).toISOString() : 'none'}`);
      
      if (lastApiCall) {
        const timeSinceLastCall = Date.now() - lastApiCall;
        const minInterval = 30000; // 30 seconds minimum between API calls
        
        console.log(`⏱️ Time since last call: ${timeSinceLastCall}ms, minimum interval: ${minInterval}ms`);
        
        if (timeSinceLastCall < minInterval) {
          const waitTime = Math.ceil((minInterval - timeSinceLastCall) / 1000);
          console.log(`⏳ RATE LIMITING TRIGGERED: Must wait ${waitTime} more seconds`);
          
          // Return cached data if available, even if refresh was requested
          const cachedProducts = cache.get(cacheKey);
          if (cachedProducts) {
            console.log(`💾 Returning cached data with rate limit message`);
            return res.status(200).json({
              ...cachedProducts,
              message: `Data refreshed recently. Next refresh available in ${waitTime} seconds.`,
              rateLimited: true
            });
          }
          
          console.log(`❌ No cached data available, returning 429`);
          return res.status(429).json({ 
            error: `Please wait ${waitTime} seconds before refreshing again.`,
            retryAfter: waitTime,
            rateLimited: true
          });
        }
      }
      
      console.log(`🗑️ Force refresh requested, clearing cache for all products (shop: ${shopId})`);
      cache.del(cacheKey);
    }

    console.log(`🛍️ Fetching all products from AI-Shirt-Guy shop ${shopId} for admin selection...`);
    
    // Record this API call for rate limiting
    const apiCallTime = Date.now();
    rateLimitCache.set(rateLimitKey, apiCallTime);
    console.log(`📝 Recording API call at: ${new Date(apiCallTime).toISOString()}`);
    
    // Fetch products with limit of 50 (API max)
    const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json?limit=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Creative-Shirt-Maker/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printify API error (all products for shop ${shopId}):`, response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: response.headers.get('retry-after') || 60
        });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch products: ${response.status}` 
      });
    }

    const data = await response.json();
    const products = data.data || [];
    
    console.log(`📦 Found ${products.length} total products in AI-Shirt-Guy shop ${shopId}`);
    
    // Return all published products with minimal info for admin selection
    const allProducts = products
      .filter(product => product.visible === true) // Only published/visible products
      .map(product => ({
        id: product.id,
        title: product.title,
        description: product.description,
        created_at: product.created_at,
        // Get the first default image or first available image
        image: product.images?.find(img => img.is_default) || product.images?.[0] || null,
        // Get price from first enabled variant
        price: product.variants?.find(variant => variant.is_enabled)?.price || null
      }));
    
    console.log(`✅ Returning ${allProducts.length} published products for admin selection`);
    
    const result = {
      data: allProducts,
      total: allProducts.length,
      shop_id: shopId,
      shop_name: "AI-Shirt-Guy"
    };
    
    // Cache the result for 10 minutes (longer since this is for admin use)
    cache.set(cacheKey, result, 600);
    
    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching all products:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching products',
      details: error.message 
    });
  }
});

/**
 * Get manually selected featured products from AI-Shirt-Guy shop
 */
router.get('/top-products', async (req, res) => {
  try {
    const shopId = 24294177; // AI-Shirt-Guy shop ID
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    // Load admin config to get featured product IDs
    const adminConfig = loadAdminConfig();
    const featuredProductIds = adminConfig.featuredProducts || [];
    
    console.log(`🛍️ Fetching featured products from AI-Shirt-Guy shop ${shopId}...`);
    console.log(`📋 Featured product IDs from admin: [${featuredProductIds.join(', ')}]`);

    // If no featured products are selected, return empty result
    if (featuredProductIds.length === 0) {
      console.log('� No featured products selected in admin config');
      const result = {
        data: [],
        total: 0,
        shop_id: shopId,
        shop_name: "AI-Shirt-Guy",
        message: "No featured products selected. Please configure featured products in the admin panel."
      };
      return res.json(result);
    }

    // Check cache first
    const cacheKey = `featured-products-${shopId}-${featuredProductIds.join('-')}`;
    const cachedProducts = cache.get(cacheKey);
    if (cachedProducts) {
      console.log(`� Cache HIT for featured products (shop: ${shopId})`);
      return res.json(cachedProducts);
    }

    // Fetch all products to filter the featured ones
    const response = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json?limit=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Creative-Shirt-Maker/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printify API error (products for shop ${shopId}):`, response.status, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: response.headers.get('retry-after') || 60
        });
      }
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch products: ${response.status}` 
      });
    }

    const data = await response.json();
    const allProducts = data.data || [];
    
    console.log(`📦 Found ${allProducts.length} total products in AI-Shirt-Guy shop ${shopId}`);
    
    // Filter for featured products and maintain the order from admin config
    const featuredProducts = [];
    for (const productId of featuredProductIds) {
      const product = allProducts.find(p => p.id === productId);
      if (product && product.visible === true) {
        featuredProducts.push({
          id: product.id,
          title: product.title,
          description: product.description,
          created_at: product.created_at,
          visible: product.visible,
          // Get the first default image or first available image
          image: product.images?.find(img => img.is_default) || product.images?.[0] || null,
          // Get price from first enabled variant
          price: product.variants?.find(variant => variant.is_enabled)?.price || null,
          // Include variant info for pricing display
          variants: product.variants?.filter(variant => variant.is_enabled).map(variant => ({
            id: variant.id,
            title: variant.title,
            price: variant.price,
            is_default: variant.is_default
          })) || []
        });
      } else if (product) {
        console.log(`⚠️ Product ${productId} found but not published/visible`);
      } else {
        console.log(`⚠️ Product ${productId} not found in shop`);
      }
    }
    
    console.log(`✅ Found ${featuredProducts.length} featured products from AI-Shirt-Guy shop`);
    
    const result = {
      data: featuredProducts,
      total: featuredProducts.length,
      shop_id: shopId,
      shop_name: "AI-Shirt-Guy",
      featured_product_ids: featuredProductIds,
      found_products: featuredProducts.length,
      total_configured: featuredProductIds.length
    };
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, result, 300);
    
    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching featured products:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching products',
      details: error.message 
    });
  }
});

/**
 * Get detailed product information including print_areas
 */
router.get('/:productId/details', async (req, res) => {
  try {
    const { productId } = req.params;
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    // Check cache first
    const cacheKey = `product_details_${productId}`;
    const cachedDetails = cache.get(cacheKey);
    if (cachedDetails) {
      console.log('💾 Cache HIT for product details:', productId);
      return res.json(cachedDetails);
    }

    console.log('🔍 Fetching details for product:', productId);
    
    const productResponse = await fetch(
      `https://api.printify.com/v1/shops/24294177/products/${productId}.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      console.error('❌ Failed to fetch product details:', errorText);
      return res.status(productResponse.status).json({ 
        error: 'Failed to fetch product details',
        details: errorText 
      });
    }

    const productData = await productResponse.json();
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, productData, 300);
    
    console.log(`✅ Product details fetched for product ${productId}`);
    res.json(productData);

  } catch (error) {
    console.error('❌ Error fetching product details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Get variants for a specific product
 */
router.get('/:productId/variants', async (req, res) => {
  try {
    const { productId } = req.params;
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    // Check cache first
    const cacheKey = `product_variants_${productId}`;
    const cachedVariants = cache.get(cacheKey);
    if (cachedVariants) {
      console.log('💾 Cache HIT for product variants:', productId);
      return res.json(cachedVariants);
    }

    console.log('🔍 Fetching variants for product:', productId);
    
    // First, get the product details to find shop_id
    const productResponse = await fetch(
      `https://api.printify.com/v1/shops/24294177/products/${productId}.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!productResponse.ok) {
      console.error('❌ Error fetching product details:', productResponse.status);
      return res.status(productResponse.status).json({ 
        error: 'Failed to fetch product details',
        status: productResponse.status 
      });
    }

    const productData = await productResponse.json();
    
    // Extract variants from the product data
    const variants = productData.variants || [];
    
    // Transform variants to match our interface
    const transformedVariants = variants.map(variant => ({
      id: variant.id,
      title: variant.title,
      options: {
        color: variant.options?.find(opt => opt.name === 'Color')?.value,
        size: variant.options?.find(opt => opt.name === 'Size')?.value
      },
      cost: variant.cost || 0,
      price: variant.price || 0,
      is_enabled: variant.is_enabled !== false,
      is_default: variant.is_default || false,
      is_available: variant.is_available !== false
    }));

    const result = {
      product_id: productId,
      variants: transformedVariants,
      total: transformedVariants.length
    };
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, result, 300);
    
    console.log(`✅ Found ${transformedVariants.length} variants for product ${productId}`);
    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching product variants:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching variants',
      details: error.message 
    });
  }
});

/**
 * Create a custom product and order (for checkout flow)
 */
router.post('/create-custom-order', async (req, res) => {
  try {
    const { templateProductId, selectedVariant, shippingAddress, customerEmail } = req.body;
    
    // Validate required fields
    if (!templateProductId || !selectedVariant || !shippingAddress || !customerEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: templateProductId, selectedVariant, shippingAddress, customerEmail' 
      });
    }

    console.log('🛍️ Creating custom product and order:', {
      templateProductId,
      variant: `${selectedVariant.options.size} ${selectedVariant.options.color}`,
      customer: customerEmail
    });

    // Use the dynamic product service to create and order
    const result = await dynamicProductService.createAndOrder(
      templateProductId,
      selectedVariant,
      shippingAddress,
      customerEmail
    );

    res.json({
      success: true,
      product_id: result.product.id,
      order_id: result.order.id,
      message: 'Custom product created and order placed successfully',
      details: {
        product_title: result.product.title,
        order_status: result.order.status,
        tracking_url: result.order.tracking_url
      }
    });

  } catch (error) {
    console.error('❌ Error creating custom product and order:', error);
    res.status(500).json({ 
      error: 'Failed to create custom product and order',
      details: error.message 
    });
  }
});

/**
 * Create a product for admin testing (no order)
 */
router.post('/create-admin-product', async (req, res) => {
  try {
    const { designUrl, shirtTemplate, prompt, blueprintId, printProviderId, price, variantId } = req.body;
    
    // Validate required fields
    if (!designUrl || !shirtTemplate || !blueprintId || !printProviderId) {
      return res.status(400).json({ 
        error: 'Missing required fields: designUrl, shirtTemplate, blueprintId, printProviderId' 
      });
    }

    console.log('🎨 Creating admin test product:', {
      shirtTemplate,
      blueprintId,
      printProviderId,
      variantId,
      prompt: prompt?.substring(0, 50) + '...'
    });

    // Create product using the dynamic service
    const result = await dynamicProductService.createAdminProduct({
      designUrl,
      shirtTemplate,
      prompt,
      blueprintId,
      printProviderId,
      price: price || 2499,
      variantId
    });

    res.json({
      success: true,
      product: result.product,
      message: 'Admin test product created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating admin product:', error);
    res.status(500).json({ 
      error: 'Failed to create admin product',
      details: error.message 
    });
  }
});

/**
 * Delete a product (admin only)
 */
router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({ error: 'Printify API token not configured' });
    }

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    console.log('🗑️ Deleting product:', productId);

    // Use the same shop ID as other endpoints
    const shopId = 24294177; // AI-Shirt-Guy shop ID

    // Delete the product
    const deleteResponse = await fetch(`https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json().catch(() => ({}));
      throw new Error(`Failed to delete product: ${deleteResponse.status} ${deleteResponse.statusText} - ${errorData.error || ''}`);
    }

    console.log('✅ Product deleted successfully:', productId);
    
    // Clear cache to ensure fresh data on next request
    const allProductsCacheKey = `all-products-${shopId}`;
    const featuredProductsCacheKey = `featured-products-${shopId}`;
    cache.del(allProductsCacheKey);
    cache.del(featuredProductsCacheKey);
    console.log('🗑️ Cache cleared after product deletion');
    
    res.json({
      success: true,
      message: 'Product deleted successfully',
      productId
    });

  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      details: error.message 
    });
  }
});

module.exports = router;