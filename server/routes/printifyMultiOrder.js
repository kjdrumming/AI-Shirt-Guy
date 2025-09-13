const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// POST /api/printify/multi-order
// Accepts: { shirts: [{ designImageUrl, title, description, variantId }], shippingAddress }
router.post('/multi-order', async (req, res) => {
  const apiToken = process.env.PRINTIFY_API_TOKEN;
  if (!apiToken) {
    return res.status(500).json({ error: 'Printify API token not configured' });
  }

  const { shirts, shippingAddress } = req.body;
  if (!Array.isArray(shirts) || shirts.length === 0 || !shippingAddress) {
    return res.status(400).json({ error: 'Missing shirts array or shipping address' });
  }

  try {
    // Step 1: Loop and create products for each shirt
    const createdProducts = [];
    for (const shirt of shirts) {
      // Upload image
      const uploadRes = await fetch('https://api.printify.com/v1/uploads/images.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_name: 'design.png', url: shirt.designImageUrl })
      });
      if (!uploadRes.ok) {
        throw new Error('Image upload failed');
      }
      const uploadData = await uploadRes.json();
      const imageId = uploadData.id;

      // Create product
      const productData = {
        title: shirt.title,
        description: shirt.description,
        blueprint_id: 6,
        print_provider_id: 103,
        variants: [
          {
            id: parseInt(shirt.variantId, 10),
            price: 2499,
            is_enabled: true
          }
        ],
        print_areas: [
          {
            variant_ids: [parseInt(shirt.variantId, 10)],
            placeholders: [
              {
                position: 'front',
                images: [
                  {
                    id: imageId,
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
      const productRes = await fetch('https://api.printify.com/v1/shops/24294177/products.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });
      if (!productRes.ok) {
        throw new Error('Product creation failed');
      }
      const product = await productRes.json();
      createdProducts.push({ product_id: product.id, variant_id: parseInt(shirt.variantId, 10) });
      // Optional: add delay here if needed for rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 2: Submit a single order with all products
    const line_items = createdProducts.map(p => ({ product_id: p.product_id, variant_id: p.variant_id, quantity: 1 }));
    const orderData = {
      external_id: `multi-order-${Date.now()}`,
      line_items,
      shipping_method: 1,
      is_printify_express: false,
      send_shipping_notification: false,
      address_to: shippingAddress
    };
    const orderRes = await fetch('https://api.printify.com/v1/shops/24294177/orders.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    if (!orderRes.ok) {
      throw new Error('Order submission failed');
    }
    const order = await orderRes.json();
    res.json({ order });
  } catch (error) {
    console.error('Multi-order error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
