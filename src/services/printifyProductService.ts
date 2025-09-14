import { calculatePrintifyPositioning } from '@/lib/printifyPositioning';
import type { ImageShape, AspectRatio } from '@/lib/utils';

interface PrintifyImage {
  id: string;
  src: string;
  name: string;
  type: string;
  height: number;
  width: number;
  x: number;
  y: number;
  scale: number;
  angle: number;
}

interface PrintifyMockupImage {
  src: string;
  variant_ids: number[];
  position: string;
  is_default: boolean;
}

interface MockupImage extends PrintifyMockupImage {
  label?: string;
  isBlankTemplate?: boolean;
  variant?: {
    id: number;
    color: string;
    size: string;
    title: string;
  };
}

interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  variants: Array<{
    id: number;
    price: number;
    is_enabled: boolean;
  }>;
  print_areas: Array<{
    variant_ids: number[];
    placeholders: Array<{
      position: string;
      images: PrintifyImage[];
    }>;
  }>;
  images?: PrintifyMockupImage[];
}

interface UploadImageResponse {
  id: string;
  file_name: string;
  height: number;
  width: number;
  size: number;
  mime_type: string;
  preview_url: string;
  upload_time: string;
}

export class PrintifyProductService {
  private readonly apiUrl = '/api/printify'; // Use proxy instead of direct API
  private readonly authToken = import.meta.env.VITE_PRINTIFY_API_TOKEN;

    // Gildan Unisex Heavy Cotton Tee - Blueprint ID 6
  private readonly blueprintId = 6;
  private readonly printProviderId = 5; // Standard print provider for Gildan

  constructor() {
    if (!this.authToken) {
      console.warn('Printify API token not found - API calls may fail');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Authorization is handled by the proxy
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Printify API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload an image to Printify for use in product creation
   */
  async uploadImage(imageFile: File): Promise<UploadImageResponse> {
    // Convert file to base64
    const base64Content = await this.fileToBase64(imageFile);
    
    const uploadData = {
      file_name: imageFile.name,
      contents: base64Content
    };

    return this.makeRequest('/uploads/images.json', {
      method: 'POST',
      body: JSON.stringify(uploadData),
    });
  }

  /**
   * Upload an image from URL to Printify
   */
  async uploadImageFromUrl(imageUrl: string, fileName: string): Promise<UploadImageResponse> {
    const uploadData = {
      file_name: fileName,
      url: imageUrl
    };

    return this.makeRequest('/uploads/images.json', {
      method: 'POST',
      body: JSON.stringify(uploadData),
    });
  }

  /**
   * Create a Printify product with design and get mockup images
   */
  async createProductWithDesign(
    shopId: string,
    designImageId: string,
    variantIds: number[],
    title: string = 'Custom Design T-Shirt',
    price: number = 2400, // $24.00 in cents
    shape: ImageShape = 'square',
    aspectRatio: AspectRatio = '1:1'
  ): Promise<PrintifyProduct> {
    const productData = {
      title,
      description: 'Custom designed t-shirt created with AI',
      blueprint_id: 676, // Unisex Hammer™ T-shirt
      print_provider_id: 74, // Ink Blot
      variants: variantIds.map(id => ({
        id,
        price,
        is_enabled: true
      })),
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position: 'front',
              images: [
                (() => {
                  const positioning = calculatePrintifyPositioning(shape, aspectRatio);
                  return {
                    id: designImageId,
                    x: positioning.x,
                    y: positioning.y,
                    scale: positioning.scale,
                    angle: positioning.angle
                  };
                })()
              ]
            }
          ]
        }
      ]
    };

    return this.makeRequest(`/shops/${shopId}/products.json`, {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  /**
   * Get existing product with mockup images
   */
  async getProduct(shopId: string, productId: string): Promise<PrintifyProduct> {
    return this.makeRequest(`/shops/${shopId}/products/${productId}.json`);
  }

  /**
   * Get blank shirt templates directly from catalog views (no product creation needed)
   * These are clean flat images without models - perfect for custom mockup backgrounds
   */
  async getBlankShirtTemplates(): Promise<MockupImage[]> {
    try {
      // First, get available blueprints to find the Gildan Heavy Cotton Tee
      const blueprintsResponse = await this.makeRequest('/catalog/blueprints.json');
      
      console.log('Searching for Gildan Heavy Cotton Tee...');
      
      if (!blueprintsResponse.data || blueprintsResponse.data.length === 0) {
        console.warn('No blueprints available in response');
        return [];
      }
      
      // Look specifically for Gildan Heavy Cotton Tee
      const gildanTees = blueprintsResponse.data.filter((bp: any) => {
        const title = bp.title?.toLowerCase() || '';
        const brand = bp.brand?.toLowerCase() || '';
        const model = bp.model?.toLowerCase() || '';
        
        const isGildan = brand.includes('gildan') || title.includes('gildan');
        const isHeavyCotton = title.includes('heavy cotton') || title.includes('heavy');
        const isTee = title.includes('tee') || title.includes('t-shirt');
        
        console.log(`Blueprint ${bp.id}: "${bp.title}" - Brand: "${bp.brand}" - Model: "${bp.model}"`);
        console.log(`  Gildan: ${isGildan}, Heavy Cotton: ${isHeavyCotton}, Tee: ${isTee}`);
        
        return isGildan && (isHeavyCotton || isTee);
      });
      
      console.log('Found Gildan tees:', gildanTees);
      
      // If we found specific Gildan tees, use the first one
      let selectedBlueprints = gildanTees;
      
      // If no Gildan found, fall back to any tee
      if (selectedBlueprints.length === 0) {
        console.log('No Gildan Heavy Cotton Tee found, searching for any Gildan shirts...');
        selectedBlueprints = blueprintsResponse.data.filter((bp: any) => {
          const title = bp.title?.toLowerCase() || '';
          const brand = bp.brand?.toLowerCase() || '';
          return brand.includes('gildan') || title.includes('gildan');
        });
      }
      
      // Still nothing? Use any t-shirt
      if (selectedBlueprints.length === 0) {
        console.log('No Gildan products found, using any t-shirt blueprints...');
        selectedBlueprints = blueprintsResponse.data.filter((bp: any) => {
          const title = bp.title?.toLowerCase() || '';
          return title.includes('t-shirt') || title.includes('tee') || title.includes('shirt');
        });
      }
      
      // Last resort - use first available
      if (selectedBlueprints.length === 0) {
        console.log('No t-shirt blueprints found, using first available blueprints');
        selectedBlueprints = blueprintsResponse.data.slice(0, 3);
      }
      
      console.log('Selected blueprints:', selectedBlueprints.map((bp: any) => `${bp.id}: ${bp.title}`));

      const blueprint = selectedBlueprints[0]; // Use the first available blueprint
      const blueprintDetails = await this.makeRequest(`/catalog/blueprints/${blueprint.id}.json`);
      
      // Get print providers for this blueprint
      const printProvidersResponse = await this.makeRequest(`/catalog/blueprints/${blueprint.id}/print_providers.json`);
      
      if (!printProvidersResponse.data || printProvidersResponse.data.length === 0) {
        console.warn(`No print providers found for blueprint ${blueprint.id}`);
        return [];
      }

      const printProvider = printProvidersResponse.data[0]; // Use the first available print provider
      
      // Get variants for this blueprint and print provider
      const variants = await this.makeRequest(
        `/catalog/blueprints/${blueprint.id}/print_providers/${printProvider.id}/variants.json`
      );

      const blankTemplates: MockupImage[] = [];

      // Extract blank templates from views
      if (blueprintDetails.views && Array.isArray(blueprintDetails.views)) {
        for (const view of blueprintDetails.views) {
          if (view.files && Array.isArray(view.files)) {
            for (const file of view.files) {
              // Find variant details for this file
              const variant = variants.data?.find((v: any) => 
                file.variant_ids && file.variant_ids.includes(v.id)
              );

              if (variant && file.src) {
                blankTemplates.push({
                  src: file.src,
                  position: view.position || 'front',
                  label: `${view.label || view.position} - ${variant.options?.color || 'Default'} ${variant.options?.size || ''}`.trim(),
                  variant_ids: file.variant_ids || [variant.id],
                  is_default: false,
                  isBlankTemplate: true,
                  variant: {
                    id: variant.id,
                    color: variant.options?.color || 'Default',
                    size: variant.options?.size || 'M',
                    title: variant.title || `${variant.options?.color} / ${variant.options?.size}`
                  }
                });
              }
            }
          }
        }
      }

      console.log(`Found ${blankTemplates.length} blank templates from blueprint views`);
      return blankTemplates;

    } catch (error) {
      console.error('Error fetching blank shirt templates:', error);
      throw new Error('Failed to fetch blank shirt templates from catalog');
    }
  }

  /**
   * Get blank template for a specific variant from catalog
   */
  async getBlankTemplateForVariant(variantId: number, position: string = 'front'): Promise<MockupImage | null> {
    const blankTemplates = await this.getBlankShirtTemplates();
    return blankTemplates.find(template => 
      template.variant_ids.includes(variantId) && 
      template.position === position &&
      template.isBlankTemplate
    ) || null;
  }

  /**
   * Get all blank templates for a specific position from catalog
   */
  async getBlankTemplatesByPosition(position: string = 'front'): Promise<MockupImage[]> {
    const blankTemplates = await this.getBlankShirtTemplates();
    return blankTemplates.filter(template => 
      template.position === position && 
      template.isBlankTemplate
    );
  }

  /**
   * Get mockup images for specific variants
   */
  getMockupForVariant(product: PrintifyProduct, variantId: number): PrintifyMockupImage | null {
    if (!product.images) return null;
    
    return product.images.find(image => 
      image.variant_ids.includes(variantId)
    ) || null;
  }

  /**
   * Get all mockups organized by position
   */
  getMockupsByPosition(product: PrintifyProduct): Record<string, PrintifyMockupImage[]> {
    if (!product.images) return {};
    
    const mockupsByPosition: Record<string, PrintifyMockupImage[]> = {};
    
    product.images.forEach(image => {
      if (!mockupsByPosition[image.position]) {
        mockupsByPosition[image.position] = [];
      }
      mockupsByPosition[image.position].push(image);
    });
    
    return mockupsByPosition;
  }

  /**
   * Create products for multiple color variants
   */
  async createMultiColorProduct(
    shopId: string,
    designImageId: string,
    colorVariants: Array<{ name: string; variantIds: number[] }>,
    baseTitle: string = 'Custom Design T-Shirt'
  ): Promise<Record<string, PrintifyProduct>> {
    const products: Record<string, PrintifyProduct> = {};
    
    // Create products sequentially to avoid rate limiting
    for (const color of colorVariants) {
      try {
        const title = `${baseTitle} - ${color.name}`;
        const product = await this.createProductWithDesign(
          shopId,
          designImageId,
          color.variantIds,
          title,
          2400, // default price
          'square', // default shape
          '1:1' // default aspect ratio
        );
        products[color.name] = product;
        
        // Small delay to respect rate limits
        await this.delay(1000);
      } catch (error) {
        console.error(`Failed to create product for ${color.name}:`, error);
      }
    }
    
    return products;
  }

  /**
   * Generate blank templates organized by color (no product creation needed!)
   * Returns blank shirt templates that can be used as mockup backgrounds
   */
  async generateBlankTemplatesForColors(
    selectedColors: string[]
  ): Promise<Record<string, MockupImage[]>> {
    try {
      // Get all blank templates from catalog
      const allBlankTemplates = await this.getBlankShirtTemplates();
      
      // Organize templates by color
      const templatesByColor: Record<string, MockupImage[]> = {};
      
      selectedColors.forEach(color => {
        const colorTemplates = allBlankTemplates.filter(template =>
          template.variant?.color?.toLowerCase() === color.toLowerCase()
        );
        templatesByColor[color] = colorTemplates;
      });
      
      return templatesByColor;
    } catch (error) {
      console.error('Failed to generate blank templates:', error);
      throw error;
    }
  }

  // Helper methods
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:image/jpeg;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // These would come from your catalog service
  private async getVariantIdsForColors(colors: string[]): Promise<number[]> {
    // This should integrate with your existing printifyCatalogService
    // For now, returning example IDs
    const colorToVariantMap: Record<string, number[]> = {
      'Black': [76251],
      'White': [76255],
      'Navy': [76253],
      // Add more color mappings
    };
    
    return colors.flatMap(color => colorToVariantMap[color] || []);
  }

  private getVariantIdsForColor(color: string): number[] {
    const colorToVariantMap: Record<string, number[]> = {
      'Black': [76251],
      'White': [76255],
      'Navy': [76253],
      // Add more color mappings
    };
    
    return colorToVariantMap[color] || [];
  }
}

export const printifyProductService = new PrintifyProductService();