// Admin configuration utilities
export interface AdminConfig {
  imageSource: "stock" | "huggingface" | "pollinations";
  debugMode: boolean;
  maxDesignsPerGeneration: number;
  enableMultiShirtSelection: boolean;
  printifyApiToken: string;
  customPromptSuggestions: string[];
  maintenanceMode: boolean;
  adminPassword: string;
}

// Default configuration
export const defaultAdminConfig: AdminConfig = {
  imageSource: "stock",
  debugMode: false,
  maxDesignsPerGeneration: 3,
  enableMultiShirtSelection: true,
  printifyApiToken: "",
  customPromptSuggestions: [],
  maintenanceMode: false,
  adminPassword: "admin123"
};

// Get current admin configuration
export const getAdminConfig = (): AdminConfig => {
  // First check if config is available in window object (set by admin page)
  if ((window as any).adminConfig) {
    return (window as any).adminConfig;
  }

  // Then check localStorage
  try {
    const savedConfig = localStorage.getItem('adminConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      return { ...defaultAdminConfig, ...parsedConfig };
    }
  } catch (error) {
    console.error('Failed to load admin config from localStorage:', error);
  }

  // Return default config
  return defaultAdminConfig;
};

// Get current image source from admin config
export const getCurrentImageSource = (): "stock" | "huggingface" | "pollinations" => {
  const config = getAdminConfig();
  return config.imageSource;
};

// Check if maintenance mode is enabled
export const isMaintenanceModeEnabled = (): boolean => {
  const config = getAdminConfig();
  return config.maintenanceMode;
};

// Check if debug mode is enabled
export const isDebugModeEnabled = (): boolean => {
  const config = getAdminConfig();
  return config.debugMode;
};

// Get max designs per generation
export const getMaxDesignsPerGeneration = (): number => {
  const config = getAdminConfig();
  return config.maxDesignsPerGeneration;
};

// Check if multi-shirt selection is enabled
export const isMultiShirtSelectionEnabled = (): boolean => {
  const config = getAdminConfig();
  return config.enableMultiShirtSelection;
};

// Get custom prompt suggestions
export const getCustomPromptSuggestions = (): string[] => {
  const config = getAdminConfig();
  return config.customPromptSuggestions;
};

// Get Printify API token
export const getPrintifyApiToken = (): string => {
  const config = getAdminConfig();
  return config.printifyApiToken;
};

// Save admin configuration
export const saveAdminConfig = (config: AdminConfig): void => {
  try {
    localStorage.setItem('adminConfig', JSON.stringify(config));
    (window as any).adminConfig = config;
  } catch (error) {
    console.error('Failed to save admin config:', error);
  }
};

// Initialize admin config on app startup
export const initializeAdminConfig = (): void => {
  const config = getAdminConfig();
  (window as any).adminConfig = config;
  
  // Listen for storage changes to update config when admin page makes changes
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'adminConfig' && e.newValue) {
        try {
          const updatedConfig = JSON.parse(e.newValue);
          (window as any).adminConfig = { ...defaultAdminConfig, ...updatedConfig };
        } catch (error) {
          console.error('Failed to parse updated admin config:', error);
        }
      }
    });
    
    // Also listen for focus events (when user switches back from admin tab)
    window.addEventListener('focus', () => {
      const config = getAdminConfig();
      (window as any).adminConfig = config;
    });
  }
};