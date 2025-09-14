import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingCart, Palette, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Product, Variant } from "@/types/product";
import { printifyIntegration } from "@/services/printifyIntegration";
import { cleanProductDescription } from "@/lib/productMetadata";

// Function to get CSS color for shirt color names (same as used in Index.tsx)
function getShirtColor(colorName: string): string {
  const colorMap: { [key: string]: string } = {
    'Dark Heather': '#3a3a3a',
    'Navy': '#1e3a8a',
    'Red': '#dc2626',
    'Royal': '#2563eb',
    'Sand': '#d4a574',
    'Sport Grey': '#8b8b8b', 
    'White': '#ffffff',
    'Black': '#000000',
    'Heather Navy': '#2c3e50',
    'Light Blue': '#93c5fd',
    'Forest Green': '#166534',
    'Maroon': '#7f1d1d',
    'Purple': '#7c3aed',
    'Orange': '#ea580c',
    'Yellow': '#facc15',
    'Pink': '#ec4899',
    'Kelly Green': '#16a34a',
    'Brown': '#92400e',
    'Ash': '#9ca3af',
    'Cardinal': '#b91c1c',
    'Gold': '#f59e0b',
    'Silver': '#d1d5db',
    'Charcoal': '#374151',
    'Carolina Blue': '#60a5fa',
    'Irish Green': '#15803d',
    'Lime': '#84cc16',
    'Military Green': '#365314',
    'Daisy': '#fef08a',
    'Coral': '#fb7185',
    'Safety Green': '#65a30d',
    'Safety Orange': '#ea580c',
    'Antique Heather': '#6b7280'
  };
  
  return colorMap[colorName] || '#6b7280'; // Default to gray if color not found
}

interface SizeColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onProceedToCheckout: (data: {
    originalProductId: string;
    newProductId: string;
    selectedVariant: Variant;
    originalProduct: Product;
    newProduct: any;
  }) => void;
}

export const SizeColorModal = ({ isOpen, onClose, product, onProceedToCheckout }: SizeColorModalProps) => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [allColors, setAllColors] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [step, setStep] = useState<'color' | 'size'>('color');
  const [globalPrice, setGlobalPrice] = useState<number>(2499); // Default price in cents

  // Load variants when product changes
  useEffect(() => {
    if (product && isOpen) {
      loadVariants();
    }
  }, [product, isOpen]);

  // Load global price from admin config with caching and error handling
  useEffect(() => {
    const loadGlobalPrice = async () => {
      try {
        // Check if we already have a cached price that's recent
        const cachedData = sessionStorage.getItem('adminConfig');
        const cacheTimestamp = sessionStorage.getItem('adminConfigTimestamp');
        const now = Date.now();
        const cacheAge = now - (parseInt(cacheTimestamp) || 0);
        
        // Use cache if it's less than 5 minutes old
        if (cachedData && cacheAge < 5 * 60 * 1000) {
          const config = JSON.parse(cachedData);
          setGlobalPrice(config.shirtPrice || 2499);
          console.log('💰 Using cached global price:', config.shirtPrice);
          return;
        }

        console.log('💰 Fetching global price from admin config...');
        const configResponse = await fetch('/api/admin/config');
        
        if (configResponse.ok) {
          const config = await configResponse.json();
          setGlobalPrice(config.shirtPrice || 2499);
          
          // Cache the config data
          sessionStorage.setItem('adminConfig', JSON.stringify(config));
          sessionStorage.setItem('adminConfigTimestamp', now.toString());
          console.log('💰 Global price loaded and cached:', config.shirtPrice);
        } else if (configResponse.status === 429) {
          console.warn('⚠️ Rate limited fetching admin config, using cached or default price');
          // Use cached data even if it's old, or default price
          if (cachedData) {
            const config = JSON.parse(cachedData);
            setGlobalPrice(config.shirtPrice || 2499);
          } else {
            setGlobalPrice(2499); // Fallback to default
          }
        } else {
          throw new Error(`Failed to load admin configuration: ${configResponse.status}`);
        }
      } catch (error) {
        console.error('Failed to load global price:', error);
        // Use cached data or default price as fallback
        const cachedData = sessionStorage.getItem('adminConfig');
        if (cachedData) {
          try {
            const config = JSON.parse(cachedData);
            setGlobalPrice(config.shirtPrice || 2499);
            console.log('💰 Using cached price as fallback');
          } catch {
            setGlobalPrice(2499);
          }
        } else {
          setGlobalPrice(2499); // Keep default price if all else fails
        }
      }
    };

    if (isOpen) {
      loadGlobalPrice();
    }
  }, [isOpen]);

  // Update available colors when variants change
  useEffect(() => {
    if (variants.length > 0) {
      const availableColors = [...new Set(
        variants
          .filter(v => v.is_available && v.is_enabled)
          .map(v => v.options.color)
          .filter(Boolean)
      )].sort();

      setAllColors(availableColors);
    }
  }, [variants]);

  // Update available sizes when color is selected
  useEffect(() => {
    if (selectedColor && variants.length > 0) {
      const sizesForColor = [...new Set(
        variants
          .filter(v => 
            v.is_available && 
            v.is_enabled && 
            v.options.color === selectedColor
          )
          .map(v => v.options.size)
          .filter(Boolean)
      )].sort();

      setAvailableSizes(sizesForColor);
      setStep('size');
      
      // Clear previously selected size since available sizes may have changed
      setSelectedSize("");
    }
  }, [selectedColor, variants]);

  // Update selected variant when size/color changes
  useEffect(() => {
    if (selectedSize && selectedColor && variants.length > 0) {
      const variant = variants.find(v => 
        v.options.size === selectedSize && 
        v.options.color === selectedColor &&
        v.is_available && 
        v.is_enabled
      );
      setSelectedVariant(variant || null);
    }
  }, [selectedSize, selectedColor, variants]);

  const loadVariants = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      // First get the admin config with caching
      const cachedData = sessionStorage.getItem('adminConfig');
      const cacheTimestamp = sessionStorage.getItem('adminConfigTimestamp');
      const now = Date.now();
      const cacheAge = now - (parseInt(cacheTimestamp) || 0);
      
      let config;
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheAge < 5 * 60 * 1000) {
        config = JSON.parse(cachedData);
        console.log('🎨 Using cached admin config for variants');
      } else {
        console.log('🎨 Fetching admin config for variants...');
        const configResponse = await fetch('/api/admin/config');
        
        if (!configResponse.ok) {
          if (configResponse.status === 429) {
            // Rate limited - use cached config or defaults
            if (cachedData) {
              config = JSON.parse(cachedData);
              console.warn('⚠️ Rate limited, using cached admin config');
            } else {
              // Use hardcoded defaults if no cache
              config = { blueprintId: 6, printProviderId: 103 };
              console.warn('⚠️ Rate limited, using default blueprint/provider');
            }
          } else {
            throw new Error(`Failed to load admin configuration: ${configResponse.status}`);
          }
        } else {
          config = await configResponse.json();
          // Cache the config
          sessionStorage.setItem('adminConfig', JSON.stringify(config));
          sessionStorage.setItem('adminConfigTimestamp', now.toString());
        }
      }
      
      const { blueprintId, printProviderId } = config;
      
      if (!blueprintId || !printProviderId) {
        throw new Error('Blueprint or print provider not configured in admin settings');
      }
      
      console.log(`🎨 Loading variants for blueprint ${blueprintId} with print provider ${printProviderId}`);
      
      // Add retry logic for variant fetching
      let retryCount = 0;
      const maxRetries = 3;
      let response;
      
      while (retryCount < maxRetries) {
        try {
          response = await fetch(`/api/catalog/blueprints/${blueprintId}/providers/${printProviderId}/variants`);
          
          if (response.ok) {
            break; // Success, exit retry loop
          } else if (response.status === 429) {
            retryCount++;
            if (retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
              console.warn(`⚠️ Rate limited (attempt ${retryCount}), retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            }
          } else {
            throw new Error(`Failed to load variants: ${response.status}`);
          }
        } catch (error) {
          if (retryCount === maxRetries - 1) {
            throw error;
          }
          retryCount++;
        }
      }
      
      if (response && response.ok) {
        const data = await response.json();
        const variants = data.variants || [];
        setVariants(variants);
        console.log(`✅ Loaded ${variants.length} variants from blueprint`);
        
        if (variants.length === 0) {
          toast.error('No size/color options available for this product configuration');
        }
      } else {
        throw new Error('Failed to load variants after retries');
      }
    } catch (error) {
      console.error('Error loading variants:', error);
      if (error.message.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else {
        toast.error(error.message || 'Error loading product options');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToCheckout = async () => {
    if (!product || !selectedVariant) {
      toast.error('Please select both size and color');
      return;
    }

    if (!product.image?.src) {
      toast.error('Product image not available');
      return;
    }

    // Don't place order yet! Just prepare checkout data and pass to parent
    // Parent will handle: Payment → Shipping → Order Placement
    
    console.log('� Preparing checkout for existing product:', {
      productId: product.id,
      variantId: selectedVariant.id,
      title: product.title,
      color: selectedColor,
      size: selectedSize
    });

    // Pass the product data to parent for payment/shipping flow
    onProceedToCheckout({
      originalProductId: product.id,
      newProductId: product.id, // Same product since we're ordering existing one
      selectedVariant,
      originalProduct: product,
      newProduct: {
        id: product.id,
        title: `${product.title} - ${selectedColor} ${selectedSize}`,
        image: product.image,
        variants: [selectedVariant]
      }
    });
    
    onClose();
  };

  const resetModal = () => {
    setVariants([]);
    setSelectedVariant(null);
    setAvailableSizes([]);
    setAllColors([]);
    setSelectedSize("");
    setSelectedColor("");
    setStep('color');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {step === 'color' && 'Choose Color & Size'}
            {step === 'size' && 'Choose Size'}
          </DialogTitle>
          <DialogDescription>
            {step === 'color' && 'Select your preferred color first, then choose the size'}
            {step === 'size' && 'Select your size from available options for this color'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {product.image?.src && (
                  <div className="flex-shrink-0">
                    <img 
                      src={product.image.src} 
                      alt={product.title}
                      className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {cleanProductDescription(product.description || '')}
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    ${(globalPrice / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading options...</span>
            </div>
          ) : (
            <>
              {/* Step 1: Color Selection */}
              {step === 'color' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <h4 className="font-medium">Step 1: Choose Color</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allColors.map((color) => {
                      const shirtColor = getShirtColor(color);
                      const isLightColor = ['White', 'Sand', 'Daisy', 'Yellow', 'Lime', 'Light Blue'].includes(color);
                      
                      return (
                        <Button
                          key={color}
                          variant={selectedColor === color ? "default" : "outline"}
                          size="sm"
                          className={`h-11 flex items-center justify-start gap-3 text-left px-3 ${
                            selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setSelectedColor(color)}
                        >
                          <div 
                            className={`w-5 h-5 rounded-full border-2 ${
                              isLightColor ? 'border-gray-400' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: shirtColor }}
                          />
                          <span className="text-sm truncate">{color}</span>
                        </Button>
                      );
                    })}
                  </div>
                  {allColors.length === 0 && (
                    <p className="text-sm text-muted-foreground">No colors available</p>
                  )}
                </div>
              )}

              {/* Step 2: Size Selection (only show after color is selected) */}
              {step === 'size' && selectedColor && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <h4 className="font-medium">Selected Color</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedColor("");
                          setSelectedSize("");
                          setStep('color');
                        }}
                        className="ml-auto text-xs"
                      >
                        Change Color
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: getShirtColor(selectedColor) }}
                      />
                      <span className="font-medium">{selectedColor}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      <h4 className="font-medium">Step 2: Choose Size</h4>
                      <span className="text-sm text-muted-foreground">
                        (Available in {selectedColor})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((size) => (
                        <Button
                          key={size}
                          variant={selectedSize === size ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSize(size)}
                          className="min-w-[60px]"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    {availableSizes.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No sizes available for {selectedColor}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Selected Variant Info - only show in size step */}
              {step === 'size' && selectedVariant && (
                <>
                  <Separator />
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Selected Options</p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Size: <strong>{selectedSize}</strong></span>
                            <span>Color: <strong className="capitalize">{selectedColor}</strong></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-green-600">
                            ${(globalPrice / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleProceedToCheckout}
              disabled={!selectedVariant || loading}
              className="flex-1"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Proceed to Checkout - ${(globalPrice / 100).toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SizeColorModal;