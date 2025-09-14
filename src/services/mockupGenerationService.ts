import { printifyProductService } from './printifyProductService';
import { printifyCatalogService } from './printifyCatalog';
import { getBlueprintId, getPrintProviderId } from "@/lib/adminConfig";

interface MockupGenerationOptions {
  designFile?: File;
  designUrl?: string;
  selectedColors: string[];
  title?: string;
  description?: string;
}

interface GeneratedMockup {
  id?: string; // Optional ID for tracking
  color: string;
  variantId?: number; // Optional since blank templates might not have specific variant IDs
  mockupUrl?: string; // Optional since some may use imageUrl instead
  imageUrl?: string; // Alternative to mockupUrl
  position: string; // 'front', 'back', etc.
  isDefault?: boolean; // Optional
  isBlankTemplate?: boolean; // Flag to indicate if this is a blank template vs mockup with model
  variant?: {
    id: number;
    color: string;
    size: string;
    title: string;
  };
  label?: string; // Optional label for the mockup
}

interface MockupGenerationResult {
  productId: string;
  mockups: GeneratedMockup[];
  uploadedImageId: string;
  success: boolean;
  error?: string;
}

export class MockupGenerationService {
  private static readonly SHOP_ID = '24294177'; // AI-Shirt-Guy shop
  // Blueprint and Print Provider IDs are now configurable via admin settings

  /**
   * Generate blank shirt templates without any models - perfect for custom mockup backgrounds
   * This method gets clean flat shirt images directly from Printify catalog
   */
  async generateBlankTemplates(colors: string[] = ['White', 'Black', 'Navy']): Promise<GeneratedMockup[]> {
    try {
      console.log('Generating blank templates for colors:', colors);

      // Get blank templates organized by color from catalog (no product creation!)
      const templatesByColor = await printifyProductService.generateBlankTemplatesForColors(colors);

      const blankMockups: GeneratedMockup[] = [];

      // Process each color
      for (const [color, templates] of Object.entries(templatesByColor)) {
        if (templates.length > 0) {
          // Use the first template for each color (usually front view)
          const template = templates[0];
          
          blankMockups.push({
            id: `blank-${color.toLowerCase()}-${Date.now()}`,
            imageUrl: template.src,
            color,
            position: template.position,
            variant: template.variant || {
              id: template.variant_ids[0] || 0,
              color,
              size: 'M',
              title: `${color} / M`
            },
            isBlankTemplate: true, // Mark as blank template
            label: template.label || `${color} Blank Template`
          });
        }
      }

      console.log(`Generated ${blankMockups.length} blank templates`);
      return blankMockups;

    } catch (error) {
      console.error('Error generating blank templates:', error);
      throw new Error('Failed to generate blank shirt templates');
    }
  }

  /**
   * Generate real Printify mockups for a design with multiple colors
   */
  static async generateMockups(options: MockupGenerationOptions): Promise<MockupGenerationResult> {
    try {
      console.log('Starting mockup generation for colors:', options.selectedColors);

      // 1. Upload the design image to Printify
      let uploadedImageId: string;
      
      if (options.designFile) {
        console.log('Uploading design file to Printify...');
        const uploadResult = await printifyProductService.uploadImage(options.designFile);
        uploadedImageId = uploadResult.id;
        console.log('Design uploaded with ID:', uploadedImageId);
      } else if (options.designUrl) {
        console.log('Uploading design from URL to Printify...');
        const fileName = `design_${Date.now()}.png`;
        const uploadResult = await printifyProductService.uploadImageFromUrl(options.designUrl, fileName);
        uploadedImageId = uploadResult.id;
        console.log('Design uploaded from URL with ID:', uploadedImageId);
      } else {
        throw new Error('Either designFile or designUrl must be provided');
      }

      // 2. Get variant IDs for the selected colors
      console.log('Fetching variant IDs for colors...');
      const variantIdsByColor = await this.getVariantIdsByColor(options.selectedColors);
      console.log('Variant IDs by color:', variantIdsByColor);

      // 3. Get all variant IDs for product creation
      const allVariantIds = Object.values(variantIdsByColor).flat();
      
      if (allVariantIds.length === 0) {
        throw new Error('No valid variants found for selected colors');
      }

      // 4. Create the product with all variants
      console.log('Creating Printify product with variants:', allVariantIds);
      const product = await printifyProductService.createProductWithDesign(
        this.SHOP_ID,
        uploadedImageId,
        allVariantIds,
        options.title || 'AI Generated Design',
        2400 // $24.00 in cents
      );

      console.log('Product created with ID:', product.id);
      console.log('Product images:', product.images?.length || 0, 'mockups generated');

      // 5. Process mockups and organize by color
      const mockups: GeneratedMockup[] = [];
      
      if (product.images) {
        for (const [color, variantIds] of Object.entries(variantIdsByColor)) {
          for (const variantId of variantIds) {
            // Find mockups for this variant
            const variantMockups = product.images.filter(img => 
              img.variant_ids.includes(variantId)
            );

            variantMockups.forEach(mockup => {
              mockups.push({
                color,
                variantId,
                mockupUrl: mockup.src,
                position: mockup.position,
                isDefault: mockup.is_default
              });
            });
          }
        }
      }

      console.log('Generated mockups:', mockups.length);

      return {
        productId: product.id,
        mockups,
        uploadedImageId,
        success: true
      };

    } catch (error) {
      console.error('Mockup generation failed:', error);
      return {
        productId: '',
        mockups: [],
        uploadedImageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get variant IDs organized by color name
   */
  private static async getVariantIdsByColor(colors: string[]): Promise<Record<string, number[]>> {
    const variantIdsByColor: Record<string, number[]> = {};

    try {
      // Get available colors from catalog service
      const availableColors = await printifyCatalogService.getAvailableShirtColors();
      
      for (const color of colors) {
        const colorData = availableColors.find(c => c.name === color);
        if (colorData && colorData.printifyVariantId) {
          variantIdsByColor[color] = [colorData.printifyVariantId];
        } else {
          console.warn(`No variant ID found for color: ${color}`);
        }
      }
    } catch (error) {
      console.error('Failed to get variant IDs from catalog service, using fallback mapping:', error);
      
      // Fallback color mapping based on our earlier API calls
      const fallbackMapping: Record<string, number[]> = {
        'Black': [76251],
        'Chambray': [76252],
        'Graphite Heather': [76253],
        'Sport Dark Green': [76254],
        'Sport Dark Maroon': [76257],
        'Sport Dark Navy': [76258],
        'Sport Purple': [76259],
        'Terracota': [76260],
        'White': [76255]
      };

      for (const color of colors) {
        if (fallbackMapping[color]) {
          variantIdsByColor[color] = fallbackMapping[color];
        }
      }
    }

    return variantIdsByColor;
  }

  /**
   * Get mockup URL for a specific color and position
   */
  static getMockupForColor(mockups: GeneratedMockup[], color: string, position: string = 'front'): string | null {
    const mockup = mockups.find(m => m.color === color && m.position === position);
    return mockup?.mockupUrl || null;
  }

  /**
   * Get the default mockup for a color (usually front view)
   */
  static getDefaultMockupForColor(mockups: GeneratedMockup[], color: string): string | null {
    // First try to get the explicitly marked default
    const defaultMockup = mockups.find(m => m.color === color && m.isDefault);
    if (defaultMockup) return defaultMockup.mockupUrl;

    // Fallback to front view
    const frontMockup = mockups.find(m => m.color === color && m.position === 'front');
    if (frontMockup) return frontMockup.mockupUrl;

    // Last resort: any mockup for this color
    const anyMockup = mockups.find(m => m.color === color);
    return anyMockup?.mockupUrl || null;
  }

  /**
   * Get all available positions for mockups
   */
  static getAvailablePositions(mockups: GeneratedMockup[]): string[] {
    const positions = new Set(mockups.map(m => m.position));
    return Array.from(positions);
  }

  /**
   * Convert design file/URL to Printify-uploadable format
   */
  static async prepareDesignForUpload(source: File | string): Promise<{ file?: File; url?: string }> {
    if (typeof source === 'string') {
      return { url: source };
    } else {
      return { file: source };
    }
  }
}

export type { MockupGenerationOptions, GeneratedMockup, MockupGenerationResult };