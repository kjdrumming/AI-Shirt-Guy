// Admin configuration API endpoints
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Path to store admin config persistently
const CONFIG_FILE_PATH = path.join(__dirname, '../data/adminConfig.json');

// Default configuration
const defaultAdminConfig = {
  imageSource: "pollinations",
  debugMode: false,
  maxDesignsPerGeneration: 3,
  enableMultiShirtSelection: true,
  customPromptSuggestions: [],
  maintenanceMode: false,
  // Printify configuration
  shirtPrice: 2499, // $24.99 in cents
  blueprintId: 6, // Standard blueprint ID
  printProviderId: 103, // Standard print provider ID
  // Featured products configuration
  featuredProducts: [] // Array of product IDs to display on homepage
};

// Load configuration from file or use defaults
function loadAdminConfig() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load config from file if it exists
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const savedConfig = JSON.parse(configData);
      console.log('📁 Loaded admin config from file:', savedConfig);
      return { ...defaultAdminConfig, ...savedConfig };
    }
  } catch (error) {
    console.error('❌ Error loading admin config from file:', error);
  }
  
  console.log('📁 Using default admin config');
  return defaultAdminConfig;
}

// Save configuration to file
function saveAdminConfig(config) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
    console.log('💾 Admin config saved to file');
    return true;
  } catch (error) {
    console.error('❌ Error saving admin config to file:', error);
    return false;
  }
}

// Load initial configuration from file
let globalAdminConfig = loadAdminConfig();

// Get global admin configuration (public endpoint)
router.get('/config', (req, res) => {
  try {
    console.log('📋 Admin config requested, returning:', globalAdminConfig);
    
    // Return config without sensitive data
    const publicConfig = {
      imageSource: globalAdminConfig.imageSource,
      debugMode: globalAdminConfig.debugMode,
      maxDesignsPerGeneration: globalAdminConfig.maxDesignsPerGeneration,
      enableMultiShirtSelection: globalAdminConfig.enableMultiShirtSelection,
      customPromptSuggestions: globalAdminConfig.customPromptSuggestions,
      maintenanceMode: globalAdminConfig.maintenanceMode,
      shirtPrice: globalAdminConfig.shirtPrice,
      blueprintId: globalAdminConfig.blueprintId,
      printProviderId: globalAdminConfig.printProviderId
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
    
    // Save to file for persistence
    const saved = saveAdminConfig(globalAdminConfig);
    if (!saved) {
      console.warn('⚠️ Failed to save config to file, but continuing with in-memory update');
    }
    
    console.log('🔧 Admin config updated:', globalAdminConfig);
    
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config: globalAdminConfig,
      persisted: saved
    });
  } catch (error) {
    console.error('Error updating admin config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

module.exports = router;