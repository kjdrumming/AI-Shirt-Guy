/**
 * Printify-compatible shirt template definitions with accurate print area positioning
 * Based on Printify's product specifications for proper image placement
 */

export interface PrintArea {
  // Print area dimensions in pixels (at 300 DPI)
  width: number;
  height: number;
  // Positioning from top-left of shirt template image
  x: number;
  y: number;
  // Maximum design dimensions to ensure quality
  maxWidth: number;
  maxHeight: number;
  // DPI requirements
  dpi: number;
}

export interface ShirtTemplateSpec {
  id: string;
  name: string;
  price: number;
  printifyProductId?: string; // Actual Printify product ID for integration
  
  // Template image specifications
  templateImage: {
    width: number;  // Template image width in pixels
    height: number; // Template image height in pixels
  };
  
  // Print areas for different positions
  printAreas: {
    front: PrintArea;
    back?: PrintArea;
    sleeve?: PrintArea;
  };
  
  // Available options
  colors: Array<{
    name: string;
    hex: string;
    printifyColorId?: string;
  }>;
  sizes: string[];
  
  // Template-specific positioning adjustments
  designPlacement: {
    // Percentage-based positioning for responsive scaling
    frontCenter: {
      top: number;    // % from top
      left: number;   // % from left  
      width: number;  // % of container width
      height: number; // % of container height
    };
  };
}

/**
 * Printify-compatible shirt template specifications
 * Based on actual Printify product dimensions and print areas
 */
export const SHIRT_TEMPLATES: Record<string, ShirtTemplateSpec> = {
  "basic-tee": {
    id: "basic-tee",
    name: "Classic T-Shirt",
    price: 24.99,
    printifyProductId: "71", // Bella + Canvas 3001 Unisex Jersey Short Sleeve Tee
    
    templateImage: {
      width: 800,
      height: 800,
    },
    
    printAreas: {
      front: {
        width: 3000,    // 10" at 300 DPI
        height: 3600,   // 12" at 300 DPI  
        x: 150,         // Centered horizontally
        y: 180,         // Start below neckline
        maxWidth: 3000,
        maxHeight: 3600,
        dpi: 300,
      },
    },
    
    designPlacement: {
      frontCenter: {
        top: 22,      // 22% from top (below neckline)
        left: 18,     // 18% from left (centered)
        width: 64,    // 64% of container width
        height: 56,   // 56% of container height
      },
    },
    
    colors: [
      { name: "Black", hex: "#000000", printifyColorId: "black" },
      { name: "White", hex: "#FFFFFF", printifyColorId: "white" },
      { name: "Navy", hex: "#1F2937", printifyColorId: "navy" },
      { name: "Gray", hex: "#6B7280", printifyColorId: "heather-grey" },
      { name: "Red", hex: "#DC2626", printifyColorId: "red" },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  
  "premium-tee": {
    id: "premium-tee",
    name: "Premium Cotton Tee",
    price: 29.99,
    printifyProductId: "146", // Next Level 6210 CVC Crew
    
    templateImage: {
      width: 800,
      height: 800,
    },
    
    printAreas: {
      front: {
        width: 2880,    // 9.6" at 300 DPI
        height: 3360,   // 11.2" at 300 DPI
        x: 160,
        y: 190,
        maxWidth: 2880,
        maxHeight: 3360,
        dpi: 300,
      },
    },
    
    designPlacement: {
      frontCenter: {
        top: 24,
        left: 20,
        width: 60,
        height: 52,
      },
    },
    
    colors: [
      { name: "Black", hex: "#000000", printifyColorId: "black" },
      { name: "White", hex: "#FFFFFF", printifyColorId: "white" },
      { name: "Charcoal", hex: "#374151", printifyColorId: "charcoal" },
      { name: "Forest", hex: "#065F46", printifyColorId: "forest" },
      { name: "Burgundy", hex: "#7C2D12", printifyColorId: "burgundy" },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  
  "hoodie": {
    id: "hoodie",
    name: "Pullover Hoodie",
    price: 49.99,
    printifyProductId: "146", // Gildan 18500 Heavy Blend Hooded Sweatshirt
    
    templateImage: {
      width: 800,
      height: 900, // Hoodies are taller
    },
    
    printAreas: {
      front: {
        width: 2700,    // 9" at 300 DPI
        height: 3300,   // 11" at 300 DPI
        x: 175,
        y: 220,         // Lower due to hood
        maxWidth: 2700,
        maxHeight: 3300,
        dpi: 300,
      },
    },
    
    designPlacement: {
      frontCenter: {
        top: 28,      // Lower for hoodies
        left: 22,
        width: 56,
        height: 48,
      },
    },
    
    colors: [
      { name: "Black", hex: "#000000", printifyColorId: "black" },
      { name: "Gray", hex: "#6B7280", printifyColorId: "sport-grey" },
      { name: "Navy", hex: "#1F2937", printifyColorId: "navy" },
      { name: "Maroon", hex: "#7C2D12", printifyColorId: "maroon" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
};

/**
 * Get template specification by ID
 */
export function getTemplateSpec(templateId: string): ShirtTemplateSpec | null {
  return SHIRT_TEMPLATES[templateId] || null;
}

/**
 * Calculate design positioning for a given template and container size
 */
export function calculateDesignPosition(
  templateId: string,
  containerWidth: number,
  containerHeight: number
) {
  const spec = getTemplateSpec(templateId);
  if (!spec) return null;
  
  const placement = spec.designPlacement.frontCenter;
  
  return {
    top: (placement.top / 100) * containerHeight,
    left: (placement.left / 100) * containerWidth,
    width: (placement.width / 100) * containerWidth,
    height: (placement.height / 100) * containerHeight,
  };
}

/**
 * Validate design dimensions against template requirements
 */
export function validateDesignDimensions(
  templateId: string,
  designWidth: number,
  designHeight: number,
  designDPI: number = 300
): { valid: boolean; issues: string[] } {
  const spec = getTemplateSpec(templateId);
  if (!spec) return { valid: false, issues: ["Template not found"] };
  
  const printArea = spec.printAreas.front;
  const issues: string[] = [];
  
  if (designDPI < printArea.dpi) {
    issues.push(`Design DPI (${designDPI}) is below required ${printArea.dpi} DPI`);
  }
  
  if (designWidth > printArea.maxWidth) {
    issues.push(`Design width (${designWidth}px) exceeds maximum ${printArea.maxWidth}px`);
  }
  
  if (designHeight > printArea.maxHeight) {
    issues.push(`Design height (${designHeight}px) exceeds maximum ${printArea.maxHeight}px`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}