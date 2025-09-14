// API route to retrieve uploaded images from Printify
const express = require('express');
const router = express.Router();

// Retrieve an uploaded image by ID from Printify
router.get('/uploads/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const apiToken = process.env.PRINTIFY_API_TOKEN;
    
    if (!apiToken) {
      return res.status(500).json({
        error: 'Printify API token not configured'
      });
    }
    
    console.log(`📸 Retrieving uploaded image: ${imageId}`);
    
    const response = await fetch(`https://api.printify.com/v1/uploads/${imageId}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to retrieve image ${imageId}: ${response.status}`);
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Failed to retrieve image: ${response.status}`,
        details: errorText
      });
    }
    
    const imageData = await response.json();
    console.log(`✅ Retrieved image data for ${imageId}:`, imageData.file_name);
    
    res.json(imageData);
    
  } catch (error) {
    console.error('❌ Error retrieving uploaded image:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;