// Simple test to verify API access through our proxy
async function testProxyAccess() {
  console.log('🔍 Testing proxy access to Printify API...\n');

  try {
    // Test the proxy endpoint that's failing
    const response = await fetch('/api/printify/v1/catalog/blueprints/6/print_providers/29/variants.json');
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response status text:', response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Variants found:', data.variants?.length || 0);
      if (data.variants && data.variants.length > 0) {
        console.log('📦 Sample variants:');
        data.variants.slice(0, 3).forEach(variant => {
          console.log(`   - ${variant.title} (${variant.options?.color || 'N/A'}, ${variant.options?.size || 'N/A'})`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error response body:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test when page loads
if (typeof window !== 'undefined') {
  window.testProxyAccess = testProxyAccess;
  console.log('Run testProxyAccess() in the console to test the API');
} else {
  // Running in Node.js
  testProxyAccess();
}