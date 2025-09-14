import axios from 'axios';

const baseURL = 'http://localhost:3001';

async function testCatalogSearch() {
  console.log('🔍 Testing Catalog Search API...\n');

  // Test Blueprint Search
  try {
    console.log('📋 Testing Blueprint Search...');
    const blueprintResponse = await axios.get(`${baseURL}/api/catalog/blueprints/search?query=unisex`);
    console.log('✅ Blueprint search successful');
    console.log(`Found ${blueprintResponse.data.length} blueprints`);
    if (blueprintResponse.data.length > 0) {
      console.log(`First result: ${blueprintResponse.data[0].title} (ID: ${blueprintResponse.data[0].id})`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Blueprint search failed:', error.response?.data || error.message);
  }

  // Test Print Provider Search (using a common blueprint ID)
  try {
    console.log('🖨️  Testing Print Provider Search...');
    const providerResponse = await axios.get(`${baseURL}/api/catalog/blueprints/6/providers/search`);
    console.log('✅ Print provider search successful');
    console.log(`Found ${providerResponse.data.length} providers`);
    if (providerResponse.data.length > 0) {
      console.log(`First result: ${providerResponse.data[0].title} (ID: ${providerResponse.data[0].id})`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Print provider search failed:', error.response?.data || error.message);
  }
}

testCatalogSearch().catch(console.error);