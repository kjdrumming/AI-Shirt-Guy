// Printify Catalog API service for fetching available shirt blueprints and variants
export interface PrintifyVariant {
  id: number;
  title: string;
  options: {
    color?: string;
    size?: string;
  };
  placeholders: {
    position: string;
    height: number;
    width: number;
  }[];
}

export interface PrintifyBlueprint {
  id: number;
  title: string;
  brand: string;
  model: string;
  images: string[];
}

export interface PrintifyProvider {
  id: number;
  title: string;
  variants: PrintifyVariant[];
}

export interface ShirtColor {
  name: string;
  cssFilter: string;
  printifyVariantId?: number;
}

// Default shirt colors with CSS filters for fallback
const DEFAULT_SHIRT_COLORS: ShirtColor[] = [
  { name: 'White', cssFilter: 'none' },
  { name: 'Black', cssFilter: 'brightness(0.1)' },
  { name: 'Navy', cssFilter: 'brightness(0.3) sepia(1) hue-rotate(220deg)' },
  { name: 'Gray', cssFilter: 'brightness(0.5)' },
  { name: 'Red', cssFilter: 'brightness(0.6) sepia(1) hue-rotate(0deg)' },
];

// Popular shirt blueprint IDs from Printify (these are commonly used t-shirt blueprints)
const POPULAR_SHIRT_BLUEPRINTS = [
  6, // Unisex Heavy Cotton Tee (Gildan)
  5, // Men's Cotton Crew Tee (Next Level)
  3, // Kids Regular Fit Tee (Delta)
  146, // Unisex Jersey Short Sleeve Tee (Bella + Canvas)
];

class PrintifyCatalogService {
  private readonly baseUrl = '/api/printify';
  private readonly apiToken = import.meta.env.VITE_PRINTIFY_API_TOKEN;
  private colorCache: Map<string, ShirtColor[]> = new Map();

  constructor() {
    if (!this.apiToken) {
      console.warn('Printify API token not configured. Using default colors.');
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        // Authorization is handled by the proxy
      }
    });

    if (!response.ok) {
      throw new Error(`Printify API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available blueprints from Printify catalog
   */
  async getBlueprints(): Promise<PrintifyBlueprint[]> {
    try {
      const response = await this.makeRequest('/catalog/blueprints.json');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch blueprints:', error);
      return [];
    }
  }

  /**
   * Get print providers for a specific blueprint
   */
  async getPrintProviders(blueprintId: number): Promise<PrintifyProvider[]> {
    try {
      const response = await this.makeRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch print providers for blueprint ${blueprintId}:`, error);
      return [];
    }
  }

  /**
   * Get variants for a specific blueprint and print provider
   */
  async getVariants(blueprintId: number, printProviderId: number): Promise<PrintifyVariant[]> {
    try {
      const response = await this.makeRequest(
        `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`
      );
      return response.data || response.variants || [];
    } catch (error) {
      console.error(`Failed to fetch variants for blueprint ${blueprintId}, provider ${printProviderId}:`, error);
      return [];
    }
  }

  /**
   * Extract unique colors from variants
   */
  private extractColorsFromVariants(variants: PrintifyVariant[]): string[] {
    const colors = new Set<string>();
    
    variants.forEach(variant => {
      if (variant.options.color) {
        colors.add(variant.options.color);
      }
    });

    return Array.from(colors);
  }

  /**
   * Convert Printify color names to CSS filters
   */
  private colorNameToCssFilter(colorName: string): string {
    const colorLower = colorName.toLowerCase();
    
    // Map common Printify color names to CSS filters
    const colorMappings: Record<string, string> = {
      'white': 'none',
      'solid white': 'none',
      'natural': 'none',
      'black': 'brightness(0.1)',
      'solid black': 'brightness(0.1)',
      'navy': 'brightness(0.3) sepia(1) hue-rotate(220deg)',
      'navy blue': 'brightness(0.3) sepia(1) hue-rotate(220deg)',
      'dark navy': 'brightness(0.2) sepia(1) hue-rotate(220deg)',
      'gray': 'brightness(0.5)',
      'grey': 'brightness(0.5)',
      'heather grey': 'brightness(0.6)',
      'sport grey': 'brightness(0.55)',
      'dark heather': 'brightness(0.4)',
      'red': 'brightness(0.6) sepia(1) hue-rotate(0deg)',
      'cardinal red': 'brightness(0.5) sepia(1) hue-rotate(0deg)',
      'dark red': 'brightness(0.4) sepia(1) hue-rotate(0deg)',
      'blue': 'brightness(0.5) sepia(1) hue-rotate(200deg)',
      'royal blue': 'brightness(0.4) sepia(1) hue-rotate(200deg)',
      'light blue': 'brightness(0.7) sepia(1) hue-rotate(200deg)',
      'green': 'brightness(0.5) sepia(1) hue-rotate(100deg)',
      'forest green': 'brightness(0.3) sepia(1) hue-rotate(100deg)',
      'kelly green': 'brightness(0.5) sepia(1) hue-rotate(120deg)',
      'purple': 'brightness(0.5) sepia(1) hue-rotate(280deg)',
      'maroon': 'brightness(0.3) sepia(1) hue-rotate(320deg)',
      'orange': 'brightness(0.6) sepia(1) hue-rotate(30deg)',
      'yellow': 'brightness(0.8) sepia(1) hue-rotate(60deg)',
      'pink': 'brightness(0.7) sepia(1) hue-rotate(300deg)',
      'brown': 'brightness(0.4) sepia(1) hue-rotate(20deg)',
      'tan': 'brightness(0.7) sepia(0.5) hue-rotate(30deg)',
    };

    // Check for exact matches first
    if (colorMappings[colorLower]) {
      return colorMappings[colorLower];
    }

    // Check for partial matches
    for (const [key, filter] of Object.entries(colorMappings)) {
      if (colorLower.includes(key) || key.includes(colorLower)) {
        return filter;
      }
    }

    // Default fallback - attempt to create a reasonable filter
    if (colorLower.includes('dark')) {
      return 'brightness(0.3)';
    } else if (colorLower.includes('light')) {
      return 'brightness(0.8)';
    } else if (colorLower.includes('heather')) {
      return 'brightness(0.6)';
    }

    // Last resort - use a neutral filter
    return 'brightness(0.6) contrast(1.2)';
  }

  /**
   * Get available shirt colors with CSS filters
   * Fetches from Printify API if available, falls back to defaults
   */
  async getAvailableShirtColors(blueprintId?: number): Promise<ShirtColor[]> {
    // Return cached colors if available
    const cacheKey = blueprintId ? `blueprint-${blueprintId}` : 'default';
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey)!;
    }

    try {
      if (!this.apiToken) {
        // No API token, return defaults
        this.colorCache.set(cacheKey, DEFAULT_SHIRT_COLORS);
        return DEFAULT_SHIRT_COLORS;
      }

      let colorsFromApi: string[] = [];

      if (blueprintId) {
        // Get colors for specific blueprint
        const providers = await this.getPrintProviders(blueprintId);
        if (providers.length > 0) {
          // Use the first provider for color options
          const variants = await this.getVariants(blueprintId, providers[0].id);
          colorsFromApi = this.extractColorsFromVariants(variants);
        }
      } else {
        // Get colors from available shirt blueprints
        const allColors = new Set<string>();
        
        // First get available blueprints
        const blueprints = await this.getBlueprints();
        console.log('Available blueprints for colors:', blueprints.length, 'total');
        
        // Look specifically for Gildan Heavy Cotton Tee
        let shirtBlueprints = blueprints.filter(bp => {
          const title = bp.title?.toLowerCase() || '';
          const brand = bp.brand?.toLowerCase() || '';
          
          const isGildan = brand.includes('gildan') || title.includes('gildan');
          const isHeavyCotton = title.includes('heavy cotton') || title.includes('heavy');
          const isTee = title.includes('tee') || title.includes('t-shirt');
          
          console.log(`Checking blueprint ${bp.id}: "${bp.title}" (Brand: ${bp.brand})`);
          
          return isGildan && (isHeavyCotton || isTee);
        });
        
        // If no Gildan Heavy Cotton found, look for any Gildan
        if (shirtBlueprints.length === 0) {
          console.log('No Gildan Heavy Cotton found, looking for any Gildan products...');
          shirtBlueprints = blueprints.filter(bp => {
            const title = bp.title?.toLowerCase() || '';
            const brand = bp.brand?.toLowerCase() || '';
            return brand.includes('gildan') || title.includes('gildan');
          });
        }
        
        // If still no Gildan, use any shirt
        if (shirtBlueprints.length === 0) {
          console.log('No Gildan products found, using any shirt blueprints');
          shirtBlueprints = blueprints.filter(bp => {
            const title = bp.title?.toLowerCase() || '';
            return title.includes('t-shirt') || title.includes('tee') || title.includes('shirt');
          });
        }
        
        // If still nothing, use first available
        if (shirtBlueprints.length === 0) {
          console.log('No shirt blueprints found, using first available blueprints');
          shirtBlueprints = blueprints.slice(0, 3);
        }
        
        shirtBlueprints = shirtBlueprints.slice(0, 5); // Limit to first 5 to avoid too many API calls
        
        console.log('Found blueprints for colors:', shirtBlueprints.length, 'blueprints');
        
        for (const blueprint of shirtBlueprints) {
          try {
            const providers = await this.getPrintProviders(blueprint.id);
            if (providers.length > 0) {
              const variants = await this.getVariants(blueprint.id, providers[0].id);
              const colors = this.extractColorsFromVariants(variants);
              colors.forEach(color => allColors.add(color));
            }
          } catch (error) {
            console.warn(`Failed to fetch colors for blueprint ${blueprint.id}:`, error);
          }
        }
        
        colorsFromApi = Array.from(allColors);
      }

      if (colorsFromApi.length === 0) {
        // No colors found, use defaults
        this.colorCache.set(cacheKey, DEFAULT_SHIRT_COLORS);
        return DEFAULT_SHIRT_COLORS;
      }

      // Convert Printify colors to our format
      const shirtColors: ShirtColor[] = colorsFromApi.map(colorName => ({
        name: colorName,
        cssFilter: this.colorNameToCssFilter(colorName)
      }));

      // Ensure we always have white first (most templates are white)
      const whiteIndex = shirtColors.findIndex(color => 
        color.name.toLowerCase().includes('white') || color.name.toLowerCase().includes('natural')
      );
      
      if (whiteIndex > 0) {
        const whiteColor = shirtColors.splice(whiteIndex, 1)[0];
        shirtColors.unshift(whiteColor);
      } else if (whiteIndex === -1) {
        // Add white if not found
        shirtColors.unshift({ name: 'White', cssFilter: 'none' });
      }

      this.colorCache.set(cacheKey, shirtColors);
      return shirtColors;

    } catch (error) {
      console.error('Failed to fetch shirt colors from Printify:', error);
      // Return defaults on error
      this.colorCache.set(cacheKey, DEFAULT_SHIRT_COLORS);
      return DEFAULT_SHIRT_COLORS;
    }
  }

  /**
   * Clear color cache (useful for refreshing data)
   */
  clearCache(): void {
    this.colorCache.clear();
  }

  /**
   * Get shirt templates info for popular blueprints
   */
  async getShirtTemplateInfo(): Promise<{ id: number; title: string; brand: string }[]> {
    try {
      const blueprints = await this.getBlueprints();
      return blueprints
        .filter(bp => POPULAR_SHIRT_BLUEPRINTS.includes(bp.id))
        .map(bp => ({
          id: bp.id,
          title: bp.title,
          brand: bp.brand
        }));
    } catch (error) {
      console.error('Failed to fetch shirt template info:', error);
      return [];
    }
  }
}

// Export singleton instance
export const printifyCatalogService = new PrintifyCatalogService();