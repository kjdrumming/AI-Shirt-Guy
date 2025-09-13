async function discoverBlueprintProviders() {
  const PRINTIFY_TOKEN = process.env.PRINTIFY_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6IjQzNWJkNjEwMDA5MTE3ZmFiYWJmNTI0N2VhZDkwOWJkNWUwNjI2MThjZTM4ODcyMTNkYWJjMWRlZGIzZGM1N2M3M2Q3OTViNDdhZGZjMWI1IiwiaWF0IjoxNzM2NjY3Nzc4LjY1MTk1MywibmJmIjoxNzM2NjY3Nzc4LjY1MTk1MywiZXhwIjoxNzY4MjAzNzc4LjY0MTkzOCwic3ViIjoiMTU3NDQyMjIiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSJdfQ.N4T0W6HtJcVJ3f_xRq11Wys9GQqvpGPTBwwgOSklnV2M9zqKqBqMOenq6cEZC09WZAhWgzPZdpC9Y8Qu7E4VaVGgYSStFf8HRhwXyN6-vTOGZiNKbJ7kpGI12uw8I4zc7dHEA5B2V0xQCWpCu6l-S4gxQZTxw1J7tDpGQ47Yr8ZJKB8vGGP6rAHNF_KDn0RqhJKfM4YzB1DgPQpWR9S74YVSm_OpLrCaM-oPKz0NJE3O7wIJN-f8eaZ8Jv3rznWNe3X8BoTCM1TJW4VpI8W3y3FZxU0vP4jGhBpL3O-bIQbTWvY_XPfNNsQ9tBzP1j6hBdLrZhOjCzK7Gw';

  console.log('🔍 Discovering print providers for blueprint ID 6 (Unisex Heavy Cotton Tee)...\n');

  try {
    // First, let's get the blueprint details
    const blueprintResponse = await fetch('https://api.printify.com/v1/catalog/blueprints/6.json', {
      headers: {
        'Authorization': `Bearer ${PRINTIFY_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!blueprintResponse.ok) {
      throw new Error(`Failed to get blueprint: ${blueprintResponse.status} ${blueprintResponse.statusText}`);
    }

    const blueprint = await blueprintResponse.json();
    console.log('📋 Blueprint Details:');
    console.log(`   ID: ${blueprint.id}`);
    console.log(`   Title: ${blueprint.title}`);
    console.log(`   Description: ${blueprint.description}`);
    console.log(`   Brand: ${blueprint.brand}`);
    console.log(`   Model: ${blueprint.model}`);
    console.log('');

    // Now get the print providers for this blueprint
    const providersResponse = await fetch('https://api.printify.com/v1/catalog/blueprints/6/print_providers.json', {
      headers: {
        'Authorization': `Bearer ${PRINTIFY_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!providersResponse.ok) {
      throw new Error(`Failed to get print providers: ${providersResponse.status} ${providersResponse.statusText}`);
    }

    const providers = await providersResponse.json();
    console.log('🏭 Available Print Providers for Blueprint ID 6:');
    console.log('');

    for (const provider of providers) {
      console.log(`   Provider ID: ${provider.id}`);
      console.log(`   Title: ${provider.title}`);
      console.log(`   Location: ${provider.location}`);
      
      // Try to get variants for this provider
      try {
        const variantsResponse = await fetch(`https://api.printify.com/v1/catalog/blueprints/6/print_providers/${provider.id}/variants.json`, {
          headers: {
            'Authorization': `Bearer ${PRINTIFY_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (variantsResponse.ok) {
          const variants = await variantsResponse.json();
          console.log(`   ✅ Variants available: ${variants.variants?.length || 0} variants`);
          
          if (variants.variants && variants.variants.length > 0) {
            console.log(`   📦 Sample variants:`);
            variants.variants.slice(0, 3).forEach(variant => {
              console.log(`      - ${variant.title} (${variant.options?.color || 'N/A'}, ${variant.options?.size || 'N/A'}) - $${(variant.price / 100).toFixed(2)}`);
            });
          }
        } else {
          console.log(`   ❌ No variants available (${variantsResponse.status})`);
        }
      } catch (variantError) {
        console.log(`   ❌ Error getting variants: ${variantError.message}`);
      }
      
      console.log('');
    }

    // Find Stacked Commerce specifically
    const stackedCommerce = providers.find(p => p.title.toLowerCase().includes('stacked'));
    if (stackedCommerce) {
      console.log('🎯 Stacked Commerce Details:');
      console.log(`   ID: ${stackedCommerce.id}`);
      console.log(`   Title: ${stackedCommerce.title}`);
      console.log(`   Location: ${stackedCommerce.location}`);
    } else {
      console.log('❌ Stacked Commerce not found for this blueprint');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

discoverBlueprintProviders();