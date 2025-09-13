// Admin configuration API endpoints
const express = require('express');
const router = express.Router();

// In-memory storage for admin config (in production, you'd use a database)
let globalAdminConfig = {
  imageSource: "stock",
  debugMode: false,
  maxDesignsPerGeneration: 3,
  enableMultiShirtSelection: true,
  customPromptSuggestions: [],
  maintenanceMode: false
};

// Get global admin configuration (public endpoint)
router.get('/config', (req, res) => {
  try {
    // Return config without sensitive data
    const publicConfig = {
      imageSource: globalAdminConfig.imageSource,
      debugMode: globalAdminConfig.debugMode,
      maxDesignsPerGeneration: globalAdminConfig.maxDesignsPerGeneration,
      enableMultiShirtSelection: globalAdminConfig.enableMultiShirtSelection,
      customPromptSuggestions: globalAdminConfig.customPromptSuggestions,
      maintenanceMode: globalAdminConfig.maintenanceMode
    };
    
    res.json(publicConfig);
  } catch (error) {
    console.error('Error getting admin config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Update global admin configuration (protected endpoint)
router.post('/config', (req, res) => {
  try {
    const { password, config } = req.body;
    
    // Simple password protection (in production, use proper authentication)
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    
    // Update global config
    globalAdminConfig = {
      ...globalAdminConfig,
      ...config
    };
    
    console.log('🔧 Admin config updated:', globalAdminConfig);
    
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config: globalAdminConfig
    });
  } catch (error) {
    console.error('Error updating admin config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

module.exports = router;