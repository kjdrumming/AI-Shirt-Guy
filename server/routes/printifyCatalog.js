// Printify catalog search API endpoints
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Cache for catalog data (1 hour)
let blueprintsCache = null;
let blueprintsCacheTime = 0;
let printProvidersCache = {};
let printProvidersCacheTime = {};
const CATALOG_CACHE_DURATION = 3600000; // 1 hour

// Fuzzy search helper
function fuzzySearch(items, query, searchFields) {
  const lowerQuery = query.toLowerCase();
  return items.filter(item => {
    return searchFields.some(field => {
      const value = item[field]?.toString().toLowerCase() || '';
      return value.includes(lowerQuery);
    });
  }).sort((a, b) => {
    // Sort by relevance - exact matches first, then partial matches
    const aRelevance = searchFields.reduce((score, field) => {
      const value = a[field]?.toString().toLowerCase() || '';
      if (value === lowerQuery) return score + 100;
      if (value.startsWith(lowerQuery)) return score + 50;
      if (value.includes(lowerQuery)) return score + 10;
      return score;
    }, 0);
    
    const bRelevance = searchFields.reduce((score, field) => {
      const value = b[field]?.toString().toLowerCase() || '';
      if (value === lowerQuery) return score + 100;
      if (value.startsWith(lowerQuery)) return score + 50;
      if (value.includes(lowerQuery)) return score + 10;
      return score;
    }, 0);
    
    return bRelevance - aRelevance;
  });
}

// Search blueprints endpoint
router.get('/blueprints/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({ blueprints: [] });
    }

    // Check cache first
    const now = Date.now();
    if (!blueprintsCache || (now - blueprintsCacheTime) > CATALOG_CACHE_DURATION) {
      console.log('🔍 Fetching blueprints from Printify API...');
      
      // Fetch blueprints from Printify API
      const response = await fetch('https://api.printify.com/v1/catalog/blueprints.json', {
        headers: {
          'Authorization': `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Printify API response status: ${response.status}`);

      if (response.status === 429) {
        console.warn('⚠️ Printify API rate limited');
        return res.status(429).json({ error: 'API rate limited, try again later' });
      }

      if (!response.ok) {
        console.error(`❌ Printify API error: ${response.status} ${response.statusText}`);
        throw new Error(`Printify API error: ${response.status}`);
      }

      const data = await response.json();
      blueprintsCache = data || [];
      blueprintsCacheTime = now;
      console.log(`📋 Cached ${blueprintsCache.length} blueprints`);
    } else {
      console.log('📋 Using cached blueprints');
    }

    // Perform fuzzy search
    const results = fuzzySearch(blueprintsCache, query.trim(), ['title', 'brand', 'model']);
    
    // Limit results and format response
    const formattedResults = results.slice(0, 20).map(blueprint => ({
      id: blueprint.id,
      title: blueprint.title,
      brand: blueprint.brand,
      model: blueprint.model,
      description: blueprint.description
    }));

    console.log(`🔍 Blueprint search for "${query}" returned ${formattedResults.length} results`);
    res.json({ blueprints: formattedResults });

  } catch (error) {
    console.error('❌ Error searching blueprints:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to search blueprints', details: error.message });
  }
});

// Search print providers for a specific blueprint
router.get('/blueprints/:blueprintId/providers/search', async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const { query = '' } = req.query;

    // Check cache first
    const now = Date.now();
    const cacheKey = blueprintId;
    
    if (!printProvidersCache[cacheKey] || (now - (printProvidersCacheTime[cacheKey] || 0)) > CATALOG_CACHE_DURATION) {
      console.log(`🔍 Fetching print providers for blueprint ${blueprintId}...`);
      
      // Fetch print providers from Printify API
      const response = await fetch(`https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers.json`, {
        headers: {
          'Authorization': `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📡 Print providers API response status: ${response.status}`);

      if (response.status === 429) {
        console.warn('⚠️ Printify API rate limited');
        return res.status(429).json({ error: 'API rate limited, try again later' });
      }

      if (!response.ok) {
        console.error(`❌ Print providers API error: ${response.status} ${response.statusText}`);
        throw new Error(`Printify API error: ${response.status}`);
      }

      const data = await response.json();
      printProvidersCache[cacheKey] = Array.isArray(data) ? data : (data.print_providers || []);
      printProvidersCacheTime[cacheKey] = now;
      console.log(`🖨️ Cached ${printProvidersCache[cacheKey].length} print providers for blueprint ${blueprintId}`);
    } else {
      console.log(`🖨️ Using cached print providers for blueprint ${blueprintId}`);
    }

    let results = printProvidersCache[cacheKey];

    // Apply fuzzy search if query provided
    if (query.trim().length >= 2) {
      results = fuzzySearch(results, query.trim(), ['title', 'location']);
    }

    // Format response
    const formattedResults = results.slice(0, 20).map(provider => ({
      id: provider.id,
      title: provider.title,
      location: provider.location
    }));

    console.log(`🔍 Provider search for blueprint ${blueprintId} with query "${query}" returned ${formattedResults.length} results`);
    res.json({ printProviders: formattedResults });

  } catch (error) {
    console.error('❌ Error searching print providers:', error);
    res.status(500).json({ error: 'Failed to search print providers' });
  }
});

// Clear cache endpoint (for testing/admin use)
router.post('/cache/clear', (req, res) => {
  blueprintsCache = null;
  blueprintsCacheTime = 0;
  printProvidersCache = {};
  printProvidersCacheTime = {};
  console.log('🗑️ Catalog cache cleared');
  res.json({ success: true, message: 'Cache cleared' });
});

module.exports = router;