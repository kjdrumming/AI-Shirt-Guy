// Admin configuration utilities
export interface AdminConfig {
  imageSource: "stock" | "huggingface" | "pollinations";
  debugMode: boolean;
  maxDesignsPerGeneration: number;
  enableMultiShirtSelection: boolean;
  customPromptSuggestions: string[];
  maintenanceMode: boolean;
}

// Local admin settings (device-specific)
interface LocalAdminSettings {
  adminPassword: string;
  printifyApiToken: string;
}

// Default configuration
export const defaultAdminConfig: AdminConfig = {
  imageSource: "stock",
  debugMode: false,
  maxDesignsPerGeneration: 3,
  enableMultiShirtSelection: true,
  customPromptSuggestions: [],
  maintenanceMode: false
};

// Default local settings
const defaultLocalSettings: LocalAdminSettings = {
  adminPassword: "admin123",
  printifyApiToken: ""
};

// Global config cache
let globalConfigCache: AdminConfig | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Fetch global admin configuration from backend
export const fetchGlobalAdminConfig = async (): Promise<AdminConfig> => {
  try {
    // Use cache if recent
    const now = Date.now();
    if (globalConfigCache && (now - lastFetchTime) < CACHE_DURATION) {
      return globalConfigCache;
    }

    const response = await fetch('/api/admin/config');
    if (!response.ok) {
      throw new Error('Failed to fetch global config');
    }
    
    const config = await response.json();
    globalConfigCache = { ...defaultAdminConfig, ...config };
    lastFetchTime = now;
    
    return globalConfigCache;
  } catch (error) {
    console.error('Failed to fetch global admin config:', error);
    return globalConfigCache || defaultAdminConfig;
  }
};

// Get current admin configuration (now fetches from backend)
export const getAdminConfig = async (): Promise<AdminConfig> => {
  return await fetchGlobalAdminConfig();
};

// Get local admin settings (still stored locally)
export const getLocalAdminSettings = (): LocalAdminSettings => {
  try {
    const savedSettings = localStorage.getItem('localAdminSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      return { ...defaultLocalSettings, ...parsedSettings };
    }
  } catch (error) {
    console.error('Failed to load local admin settings:', error);
  }
  return defaultLocalSettings;
};

// Save local admin settings
export const saveLocalAdminSettings = (settings: Partial<LocalAdminSettings>): void => {
  try {
    const currentSettings = getLocalAdminSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem('localAdminSettings', JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Failed to save local admin settings:', error);
  }
};

// Update global admin configuration (sends to backend)
export const updateGlobalAdminConfig = async (config: Partial<AdminConfig>, password: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        config
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update config');
    }

    // Clear cache to force refresh
    globalConfigCache = null;
    
    return true;
  } catch (error) {
    console.error('Failed to update global admin config:', error);
    throw error;
  }
};

// Get current image source from cached global config (synchronous)
export const getCurrentImageSource = (): "stock" | "huggingface" | "pollinations" => {
  return globalConfigCache?.imageSource || defaultAdminConfig.imageSource;
};

// Get current image source from global admin config (async - use for guaranteed fresh data)
export const getCurrentImageSourceAsync = async (): Promise<"stock" | "huggingface" | "pollinations"> => {
  const config = await getAdminConfig();
  return config.imageSource;
};

// Check if maintenance mode is enabled (synchronous)
export const isMaintenanceModeEnabled = (): boolean => {
  return globalConfigCache?.maintenanceMode || defaultAdminConfig.maintenanceMode;
};

// Check if maintenance mode is enabled (async)
export const isMaintenanceModeEnabledAsync = async (): Promise<boolean> => {
  const config = await getAdminConfig();
  return config.maintenanceMode;
};

// Check if debug mode is enabled (synchronous)
export const isDebugModeEnabled = (): boolean => {
  return globalConfigCache?.debugMode || defaultAdminConfig.debugMode;
};

// Check if debug mode is enabled (async)
export const isDebugModeEnabledAsync = async (): Promise<boolean> => {
  const config = await getAdminConfig();
  return config.debugMode;
};

// Get max designs per generation (synchronous)
export const getMaxDesignsPerGeneration = (): number => {
  return globalConfigCache?.maxDesignsPerGeneration || defaultAdminConfig.maxDesignsPerGeneration;
};

// Get max designs per generation (async)
export const getMaxDesignsPerGenerationAsync = async (): Promise<number> => {
  const config = await getAdminConfig();
  return config.maxDesignsPerGeneration;
};

// Check if multi-shirt selection is enabled (synchronous)
export const isMultiShirtSelectionEnabled = (): boolean => {
  return globalConfigCache?.enableMultiShirtSelection || defaultAdminConfig.enableMultiShirtSelection;
};

// Check if multi-shirt selection is enabled (async)
export const isMultiShirtSelectionEnabledAsync = async (): Promise<boolean> => {
  const config = await getAdminConfig();
  return config.enableMultiShirtSelection;
};

// Get custom prompt suggestions (synchronous)
export const getCustomPromptSuggestions = (): string[] => {
  return globalConfigCache?.customPromptSuggestions || defaultAdminConfig.customPromptSuggestions;
};

// Get custom prompt suggestions (async)
export const getCustomPromptSuggestionsAsync = async (): Promise<string[]> => {
  const config = await getAdminConfig();
  return config.customPromptSuggestions;
};

// Get Printify API token from local settings
export const getPrintifyApiToken = (): string => {
  const settings = getLocalAdminSettings();
  return settings.printifyApiToken;
};

// Initialize admin config on app startup
export const initializeAdminConfig = async (): Promise<void> => {
  // Fetch initial global config
  await fetchGlobalAdminConfig();
  
  // Set up periodic refresh of global config
  if (typeof window !== 'undefined') {
    // Refresh global config every 30 seconds
    setInterval(async () => {
      try {
        await fetchGlobalAdminConfig();
      } catch (error) {
        console.error('Failed to refresh global admin config:', error);
      }
    }, 30000);
  }
};