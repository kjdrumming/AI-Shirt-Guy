import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PromptInput } from "@/components/PromptInput";
import { DesignDisplay } from "@/components/DesignDisplay";
import { ShirtTemplates } from "@/components/ShirtTemplates";
import { OrderSummary } from "@/components/OrderSummary";
import { StripeCheckout } from "@/components/StripeCheckout";
import { ShippingAddressForm, type ShippingAddress } from "@/components/ShippingAddressForm";
import { TopProducts } from "@/components/TopProducts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Shirt, CheckCircle, ArrowLeft, Wand2, Image, Loader2, X, ZoomIn, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateImages, cleanupImageUrls, type GeneratedImage } from "@/services/huggingface";
import type { ImageShape, AspectRatio } from "@/lib/utils";
import { generateStockImages, cleanupStockImages, type StockImage } from "@/services/stockImages";
import { pollinationsService, cleanupPollinationsImages, type PollinationsImage } from "@/services/pollinations";
import { printifyIntegration, type PrintifyProduct } from "../services/printifyIntegration";
import { getCurrentImageSource, getCurrentImageSourceAsync, isDebugModeEnabled, getMaxDesignsPerGeneration, isMultiShirtSelectionEnabled, isMaintenanceModeEnabled, getShirtPrice } from "@/lib/adminConfig";
import { extractOriginalDesignUrl } from "@/lib/productMetadata";

interface Design {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
  originalPrompt?: string; // Store original user prompt for cleaner display
  shape: ImageShape;
  aspectRatio: AspectRatio;
}

interface ShirtTemplate {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  colors: string[];
  sizes: string[];
}

type AppStep = "prompt" | "designs" | "variants" | "creating" | "payment" | "stripe" | "shipping" | "success";
type ImageMode = "stock" | "huggingface" | "pollinations";

const Index = () => {
  const location = useLocation();
  
  // Check for maintenance mode
  if (isMaintenanceModeEnabled()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-6">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Under Maintenance</h1>
          <p className="text-gray-600 mb-6">
            We're currently updating our system to serve you better. Please check back in a few minutes.
          </p>
          <div className="text-sm text-gray-500">
            Thank you for your patience!
          </div>
        </div>
      </div>
    );
  }

  const [currentStep, setCurrentStep] = useState<AppStep>("prompt");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isConfigInitialized, setIsConfigInitialized] = useState(false);
  const [designs, setDesigns] = useState<(Design | StockImage | PollinationsImage)[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | StockImage | null>(null);
  // Multi-shirt selection state
  const [selectedShirts, setSelectedShirts] = useState<Array<{
    design: Design | StockImage | PollinationsImage;
    color: string;
    size: string;
    variant: any;
    product?: PrintifyProduct;
  }>>([]);
  const [selectedDesigns, setSelectedDesigns] = useState<(Design | StockImage | PollinationsImage)[]>([]);
  const [designConfigs, setDesignConfigs] = useState<{[designId: string]: {color: string, size: string, variant: any}}>({});
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [currentConfigDesign, setCurrentConfigDesign] = useState<Design | StockImage | PollinationsImage | null>(null);
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<PrintifyProduct | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [selectedProductImageIndex, setSelectedProductImageIndex] = useState<number>(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [activeGalleryShirtIndex, setActiveGalleryShirtIndex] = useState<number>(-1);
  const [featuredProductOrder, setFeaturedProductOrder] = useState<{
    productId: string;
    variantId: number;
    quantity: number;
    totalPrice: number;
    productTitle: string;
    productDescription: string;
    originalColor?: string; // Store original featured product color for comparison
  } | null>(null);  // Check for featured product workflow navigation from TopProducts modal
  useEffect(() => {
    if (location.state?.featuredProductWorkflow && !featuredProductOrder) {
      const workflowData = location.state.featuredProductWorkflow;
      console.log('🎯 Featured product workflow detected:', workflowData);
      
      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, '', window.location.pathname);
      
      // For featured products, we don't create new products - we order the existing one
      // Store the order details for after payment/shipping
      setFeaturedProductOrder({
        productId: workflowData.originalProduct.id,
        variantId: workflowData.selectedVariant.id,
        quantity: 1,
        totalPrice: getShirtPrice() / 100, // Convert from cents to dollars
        productTitle: workflowData.originalProduct.title,
        productDescription: `${workflowData.originalProduct.title} (${workflowData.selectedVariant.options?.color || ''} ${workflowData.selectedVariant.options?.size || ''})`
      });

      // Fetch full product data to get all images
      const fetchFullProductData = async () => {
        try {
          const response = await fetch(`/api/printify/shops/24294177/products/${workflowData.originalProduct.id}.json`);
          if (response.ok) {
            const fullProduct = await response.json();
            console.log('✅ Fetched full product data with images:', fullProduct.images?.length || 0, 'images');
            
            // Extract original design URL from product description, fallback to mockup
            const originalDesignUrl = extractOriginalDesignUrl(fullProduct.description || '');
            const designImageUrl = originalDesignUrl || fullProduct.images?.[0]?.src || '';
            
            if (originalDesignUrl) {
              console.log('✅ Using original design URL for featured product:', originalDesignUrl);
            } else {
              console.warn('⚠️ No original design URL found for featured product, using mockup');
            }
            
            // Set up the selected shirts array for display purposes with full product data
            const featuredShirt = {
              design: {
                id: fullProduct.id,
                imageUrl: designImageUrl,
                title: fullProduct.title,
                prompt: fullProduct.description || fullProduct.title,
                shape: 'square' as ImageShape,
                aspectRatio: '1:1' as AspectRatio
              },
              color: workflowData.selectedVariant.options?.color || '',
              size: workflowData.selectedVariant.options?.size || '',
              variant: workflowData.selectedVariant,
              product: {
                id: fullProduct.id,
                title: fullProduct.title || 'Featured Product',
                description: fullProduct.description || 'Premium quality product available for immediate order.',
                images: fullProduct.images || []
              } // Include full product images for preview
            };
            
            // Store original product color for color matching comparison
            // Get the first variant color as the "original" color that the preview images show
            console.log('🔍 Debugging variant extraction:');
            console.log('  fullProduct.variants keys:', Object.keys(fullProduct.variants));
            console.log('  fullProduct.variants structure:', fullProduct.variants);
            
            const originalVariantId = Object.keys(fullProduct.variants)[0];
            const originalVariant = fullProduct.variants[originalVariantId];
            console.log('  originalVariantId:', originalVariantId);
            console.log('  originalVariant:', originalVariant);
            console.log('  originalVariant.options:', originalVariant?.options);
            
            // Try different ways to get the original color
            let originalColor = '';
            
            console.log('🔍 Analyzing originalVariant structure:');
            console.log('  originalVariant:', originalVariant);
            console.log('  originalVariant.options:', originalVariant?.options);
            console.log('  originalVariant.title:', originalVariant?.title);
            
            // Check if options is an object with direct color property
            if (originalVariant?.options?.color) {
              originalColor = originalVariant.options.color;
              console.log('🎯 Found color in options.color:', originalColor);
            }
            // Check if options is an object with Color property (capital C)
            else if (originalVariant?.options?.Color) {
              originalColor = originalVariant.options.Color;
              console.log('🎯 Found color in options.Color:', originalColor);
            }
            // Extract color from variant title if available
            else if (originalVariant?.title) {
              const colorMatch = originalVariant.title.match(/\b(Black|White|Navy|Red|Blue|Green|Gray|Grey|Pink|Purple|Yellow|Orange|Brown|Heather\s+\w+|Mauve)\b/i);
              originalColor = colorMatch ? colorMatch[0] : '';
              console.log('🎯 Extracted color from title:', originalColor);
            }
            // If options is an array, we may need to map it to the blueprint's option structure
            else if (originalVariant?.options && Array.isArray(originalVariant.options)) {
              console.log('🔍 Options is array, checking if we can map to blueprint structure...');
              // This might be variant option IDs that need to be mapped to actual values
              // For now, we'll skip this complex mapping and use fallback
              originalColor = '';
            }
            
            // Fallback: Use the selected color as the original if we can't determine the actual original
            if (!originalColor && workflowData.selectedVariant.options?.color) {
              // If we can't find the original, at least show a warning if the user picks a different color later
              originalColor = 'White'; // Most product images are on white/light backgrounds by default
              console.log('🔄 Using fallback original color:', originalColor);
            }
            
            console.log('🎨 Featured product color info:');
            console.log('  originalColor:', originalColor);
            console.log('  selectedColor:', workflowData.selectedVariant.options?.color);
            console.log('  originalVariantId:', originalVariantId);
            console.log('  totalVariants:', Object.keys(fullProduct.variants).length);
            console.log('  fullProduct.variants:', fullProduct.variants);
            
            setFeaturedProductOrder(prev => prev ? {
              ...prev,
              originalColor: originalColor
            } : prev);
            
            setSelectedShirts([featuredShirt]);
            
          } else {
            console.error('Failed to fetch full product data');
            // Fallback to basic setup without images
            setupBasicFeaturedShirt();
          }
        } catch (error) {
          console.error('Error fetching full product data:', error);
          // Fallback to basic setup without images
          setupBasicFeaturedShirt();
        }
      };

      const setupBasicFeaturedShirt = () => {
        // Extract original design URL from product description, fallback to mockup
        const originalDesignUrl = extractOriginalDesignUrl(workflowData.originalProduct.description || '');
        const designImageUrl = originalDesignUrl || workflowData.originalProduct.image || '';
        
        if (originalDesignUrl) {
          console.log('✅ Using original design URL for featured product:', originalDesignUrl);
        } else {
          console.warn('⚠️ No original design URL found for featured product, using fallback');
        }
        
        // Set up the selected shirts array for display purposes with basic data
        const featuredShirt = {
          design: {
            id: workflowData.originalProduct.id,
            imageUrl: designImageUrl,
            title: workflowData.originalProduct.title,
            prompt: workflowData.originalProduct.description || workflowData.originalProduct.title,
            shape: 'square' as ImageShape,
            aspectRatio: '1:1' as AspectRatio
          },
          color: workflowData.selectedVariant.options?.color || '',
          size: workflowData.selectedVariant.options?.size || '',
          variant: workflowData.selectedVariant,
          product: {
            id: workflowData.originalProduct.id,
            title: workflowData.originalProduct.title || 'Featured Product',
            description: workflowData.originalProduct.description || 'Premium quality product available for immediate order.',
            images: [] // No images available
          }
        };
        
        setSelectedShirts([featuredShirt]);
      };

      // Fetch full product data
      fetchFullProductData();
      
      // Jump directly to payment step
      setCurrentStep('payment');
      
      toast.success(`Featured product ready for payment: ${workflowData.originalProduct.title}`);
    }
  }, [location.state]);

  // Cleanup blob URLs when component unmounts or designs change
  useEffect(() => {
    return () => {
      if (designs.length > 0) {
        const currentImageMode = getCurrentImageSource();
        if (currentImageMode === "huggingface") {
          cleanupImageUrls(designs as GeneratedImage[]);
        } else if (currentImageMode === "stock") {
          cleanupStockImages(designs as StockImage[]);
        } else if (currentImageMode === "pollinations") {
          cleanupPollinationsImages(designs as PollinationsImage[]);
        }
      }
    };
  }, [designs]);

  // Initialize global configuration on component mount
  useEffect(() => {
    const initializeConfig = async () => {
      try {
        // Wait for global config to be available
        const imageSource = await getCurrentImageSourceAsync();
        console.log('🚀 Index component initialized with image source:', imageSource);
        setIsConfigInitialized(true);
      } catch (error) {
        console.error('Failed to initialize config in Index component:', error);
        // Still proceed to prevent blocking the app
        setIsConfigInitialized(true);
      }
    };

    initializeConfig();
  }, []);

  // Download function for images
  const handleDownloadImage = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_design.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${title}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  // Function to preload images and wait for them to be ready
  const preloadImages = (imageUrls: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      let loadedCount = 0;
      const totalImages = imageUrls.length;
      
      if (totalImages === 0) {
        resolve();
        return;
      }
      
      const handleImageLoad = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          resolve();
        }
      };
      
      const handleImageError = () => {
        // Still count as "loaded" to prevent hanging, but could be enhanced
        loadedCount++;
        if (loadedCount === totalImages) {
          resolve();
        }
      };
      
      imageUrls.forEach(url => {
        const img = document.createElement('img');
        img.onload = handleImageLoad;
        img.onerror = handleImageError;
        img.src = url;
      });
    });
  };

  const handleGenerate = async (prompt: string, shape: ImageShape = 'square', aspectRatio: AspectRatio = '1:1') => {
    setIsGenerating(true);
    setCurrentStep("designs"); // Stay on designs step while loading
    setIsLoadingVariants(true); // Start loading variants immediately
    
    try {
      // Start both operations in parallel
      const imagePromise = (async () => {
        const currentImageMode = getCurrentImageSource();
        if (currentImageMode === "huggingface") {
          toast.info("AI is creating your designs...");
          const maxDesigns = getMaxDesignsPerGeneration();
          const generatedImages = await generateImages(prompt, shape, aspectRatio, maxDesigns);
          setDesigns(generatedImages);
          
          // Wait for images to actually load
          toast.info("Loading images...");
          await preloadImages(generatedImages.map(img => img.imageUrl));
          
          toast.success(`${generatedImages.length} amazing AI designs ready!`);
          return generatedImages;
        } else if (currentImageMode === "pollinations") {
          toast.info("Pollinations.ai is creating your designs...");
          const maxDesigns = getMaxDesignsPerGeneration();
          const pollinationsImages = await pollinationsService.generateImages(prompt, shape, aspectRatio, maxDesigns);
          setDesigns(pollinationsImages);
          
          // Wait for images to actually load
          toast.info("Loading images...");
          await preloadImages(pollinationsImages.map(img => img.imageUrl));
          
          toast.success(`${pollinationsImages.length} beautiful AI designs ready!`);
          return pollinationsImages;
        } else {
          toast.info("Loading curated stock designs...");
          const maxDesigns = getMaxDesignsPerGeneration();
          const stockImages = await generateStockImages(prompt, shape, aspectRatio, maxDesigns);
          setDesigns(stockImages);
          
          // Wait for images to actually load
          toast.info("Loading images...");
          await preloadImages(stockImages.map(img => img.imageUrl));
          
          toast.success(`${stockImages.length} beautiful stock designs ready!`);
          return stockImages;
        }
      })();

      const variantsPromise = (async () => {
        toast.info("Loading shirt options from Printify...");
        try {
          const variants = await printifyIntegration.getBlueprint6Variants();
          setAvailableVariants(variants);
          return variants;
        } catch (variantError) {
          console.error('Failed to load variants:', variantError);
          toast.error("Failed to load shirt options. Using defaults.");
          throw variantError;
        }
      })();

      // Wait for BOTH operations to complete (includes image preloading)
      const [images, variants] = await Promise.all([imagePromise, variantsPromise]);
      
      // Only transition when everything is ready (images loaded and rendered)
      toast.success("All images loaded and ready! Choose your designs.");
      setCurrentStep("variants");
      
    } catch (error) {
      console.error('Error in generation process:', error);
      const currentImageMode = getCurrentImageSource();
      const modeLabel = currentImageMode === "huggingface" ? "Hugging Face AI" : 
                       currentImageMode === "pollinations" ? "Pollinations AI" : "stock";
      toast.error(`Failed to generate ${modeLabel} designs. Please try again.`);
      setCurrentStep("prompt"); // Go back to prompt on error
    } finally {
      setIsGenerating(false);
      setIsLoadingVariants(false);
    }
  };

  const handleSelectDesign = (design: Design | StockImage) => {
    if (selectedDesigns.find(d => d.id === design.id)) {
      // If already selected, remove it
      setSelectedDesigns(prev => prev.filter(d => d.id !== design.id));
      setDesignConfigs(prev => {
        const newConfigs = { ...prev };
        delete newConfigs[design.id];
        return newConfigs;
      });
    } else if (selectedDesigns.length < 3) {
      // Open configuration modal for new design
      setCurrentConfigDesign(design);
      setConfigModalOpen(true);
    } else {
      toast.error("You can only select up to 3 designs");
    }
  };

  const handleConfigSubmit = (color: string, size: string, variant: any) => {
    if (currentConfigDesign) {
      // Add design to selected list with configuration
      setSelectedDesigns(prev => [...prev, currentConfigDesign]);
      setDesignConfigs(prev => ({
        ...prev,
        [currentConfigDesign.id]: { color, size, variant }
      }));
      
      // Close modal and reset
      setConfigModalOpen(false);
      setCurrentConfigDesign(null);
      
      toast.success(`Design configured: ${color} ${size}`);
    }
  };

  const handleCreateProduct = async () => {
    // Check if all selected designs have color, size, and variant configured
    const readyShirts = selectedDesigns.filter(design => {
      const config = designConfigs[design.id];
      return config && config.color && config.size && config.variant;
    });

    if (readyShirts.length === 0) {
      toast.error("Please configure at least one shirt with color and size");
      return;
    }

    setIsCreatingProduct(true);
    setCurrentStep("creating");

    try {
      toast.info("Creating products...");
      
      // Loop through each selected design and create products
      const createdProducts = [];
      for (let i = 0; i < readyShirts.length; i++) {
        const design = readyShirts[i];
        const config = designConfigs[design.id];
        
        toast.info(`Creating product ${i + 1} of ${readyShirts.length}: ${design.title}`);
        
        const product = await printifyIntegration.createProductFromDesign(
          design.imageUrl,
          design.title,
          design.prompt || design.title,
          config.variant.id,
          design.shape || 'square',
          design.aspectRatio || '1:1'
        );
        
        createdProducts.push({
          product,
          config,
          design
        });
        
        // Add delay between product creation to respect rate limits
        if (i < readyShirts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Build final selected shirts array with created products
      const finalShirts = createdProducts.map(({ product, config, design }) => ({
        design,
        color: config.color,
        size: config.size,
        variant: config.variant,
        product
      }));

      setSelectedShirts(finalShirts);
      setCurrentStep("payment");
      toast.success(`${finalShirts.length} product(s) created successfully! 🎉`);
      
    } catch (error) {
      console.error('Error creating products:', error);
      toast.error("Failed to create products. Please try again.");
      setCurrentStep("variants");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleProceedToPayment = () => {
    setCurrentStep("stripe");
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setPaymentIntentId(paymentIntentId);
    toast.success("Payment successful! 🎉");
    setCurrentStep("shipping");
  };

  const handlePaymentError = (error: string) => {
    toast.error(`Payment failed: ${error}`);
    console.error('Payment error:', error);
  };

  const handleDevFreePayment = () => {
    // For development/testing - skip payment and go directly to shipping
    setPaymentIntentId('dev_free_payment_' + Date.now());
    toast.success("Development mode - Payment skipped! 🚀");
    setCurrentStep("shipping");
  };

  const handleShippingSubmit = async (address: ShippingAddress) => {
    setShippingAddress(address);

    if (selectedShirts.length === 0 || !paymentIntentId) {
      toast.error("Missing shirt selections or payment information");
      return;
    }

    try {
      // Check if this is a featured product order (direct ordering) 
      if (featuredProductOrder) {
        toast.info("Placing your featured product order...");
        
        // Order the existing featured product directly
        const orderData = {
          external_id: `featured-order-${Date.now()}`,
          line_items: [{
            product_id: featuredProductOrder.productId,
            variant_id: featuredProductOrder.variantId,
            quantity: featuredProductOrder.quantity
          }],
          shipping_method: 1,
          is_printify_express: false,
          send_shipping_notification: false,
          address_to: address
        };

        const response = await fetch("/api/printify/shops/24294177/orders.json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        const result = await response.json();
        console.log('✅ Featured product order placed:', result);
        toast.success("Featured product order placed successfully! 🎉");
        
      } else {
        // Regular multi-shirt order (created products)
        toast.info("Processing multi-shirt order...");
        
        // Create line items from the created products
        const lineItems = selectedShirts.map(shirt => ({
          product_id: shirt.product?.id,
          variant_id: shirt.variant.id,
          quantity: 1
        }));

        // Submit order directly using the created products
        const orderData = {
          external_id: `multi-order-${Date.now()}`,
          line_items: lineItems,
          shipping_method: 1,
          is_printify_express: false,
          send_shipping_notification: false,
          address_to: address
        };

        const response = await fetch("/api/printify/shops/24294177/orders.json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText);
        }

        const result = await response.json();
        toast.success("Multi-shirt order placed successfully! 🎉");
      }
      
      setCurrentStep("success");
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error("Failed to place order. Please try again.");
      setCurrentStep("stripe");
    }
  };

  const handleCancelProduct = async () => {
    if (selectedShirts.length === 0) {
      return;
    }

    try {
      toast.info("Canceling products...");
      
      // Delete all created products from Printify (only for custom products, not featured)
      for (const shirt of selectedShirts) {
        if (shirt.product?.id && !featuredProductOrder) {
          await printifyIntegration.deleteProduct(shirt.product.id);
        }
      }
      
      toast.success("Products canceled successfully");
      setSelectedShirts([]);
      
      // For featured products, go back to prompt (start over)
      // For custom products, go back to variant selection
      if (featuredProductOrder) {
        setFeaturedProductOrder(null);
        // Clear any navigation state that might re-trigger featured product workflow
        window.history.replaceState({}, '', window.location.pathname);
        setCurrentStep("prompt");
        toast.info("Returning to start - select a new design or featured product");
      } else {
        setCurrentStep("variants");
      }
      
    } catch (error) {
      console.error('Failed to delete products:', error);
      toast.error("Failed to cancel products");
    }
  };

  const resetApp = () => {
    // Cleanup previous designs before resetting
    if (designs.length > 0) {
      const currentImageMode = getCurrentImageSource();
      if (currentImageMode === "huggingface") {
        cleanupImageUrls(designs as GeneratedImage[]);
      } else if (currentImageMode === "stock") {
        cleanupStockImages(designs as StockImage[]);
      } else if (currentImageMode === "pollinations") {
        cleanupPollinationsImages(designs as PollinationsImage[]);
      }
    }
    
    setCurrentStep("prompt");
    setDesigns([]);
    setSelectedDesign(null);
    setSelectedDesigns([]);
    setDesignConfigs({});
    setSelectedShirts([]);
    setCreatedProduct(null);
    setShippingAddress(null);
    setPaymentIntentId(null);
    setSelectedProductImageIndex(0);
    setIsImageModalOpen(false);
    setActiveGalleryShirtIndex(-1);
    setIsCreatingProduct(false);
    setConfigModalOpen(false);
    setCurrentConfigDesign(null);
    setFeaturedProductOrder(null); // Clear featured product state
  };

  const stepTitles = {
    prompt: "Create Your Design",
    designs: "Choose Your Favorite", 
    variants: "Select Image, Size & Color",
    creating: "Creating Your Product",
    payment: "Review & Pay",
    stripe: "Secure Payment",
    shipping: "Shipping Address",
    success: "Order Complete"
  };

  return (
    <>
      {/* Show loading screen while config is being initialized */}
      {!isConfigInitialized && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading AI Shirt Guy</h1>
            <p className="text-gray-600 mb-6">
              Initializing your personalized design experience...
            </p>
          </div>
        </div>
      )}

      {/* Main app content - only show when config is initialized */}
      {isConfigInitialized && (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg ${
                currentStep === "creating" ? "animate-pulse" : ""
              }`}>
                <Shirt className={`h-7 w-7 text-white ${
                  currentStep === "creating" ? "animate-pulse" : ""
                }`} />
                <div className={`absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-1 ${
                  currentStep === "creating" ? "animate-bounce" : ""
                }`}>
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                {/* Extra glow effect when creating */}
                {currentStep === "creating" && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-xl opacity-40 animate-ping"></div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">AI Shirt Guy</h1>
              </div>
            </div>
            
            {/* Shirt Shop Button and Start Over Button */}
            <div className="flex items-center gap-3">
              {currentStep === "prompt" && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const productsSection = document.getElementById('shirt-shop');
                    if (productsSection) {
                      productsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="gap-2"
                >
                  <Shirt className="h-4 w-4" />
                  Shirt Shop
                </Button>
              )}
              {currentStep !== "prompt" && currentStep !== "success" && (
                <Button variant="ghost" onClick={resetApp}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      {currentStep !== "success" && (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
            {["prompt", "designs", "variants", "creating", "payment", "shipping"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step 
                    ? 'bg-primary text-primary-foreground' 
                    : index < ["prompt", "designs", "variants", "creating"].indexOf(currentStep)
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {index < ["prompt", "designs", "variants", "creating"].indexOf(currentStep) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 5 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    index < ["prompt", "designs", "variants", "creating"].indexOf(currentStep)
                      ? 'bg-success'
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <h2 className="text-2xl font-bold">{stepTitles[currentStep]}</h2>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {currentStep === "prompt" && (
          <div className="space-y-8">
            <PromptInput 
              onGenerate={handleGenerate} 
              isGenerating={isGenerating}
            />
            
            {/* Top Products Section */}
            <div id="shirt-shop">
              <TopProducts />
            </div>
          </div>
        )}

        {currentStep === "designs" && (
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 text-center">
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Creating Your Designs</h2>
                  <p className="text-muted-foreground text-lg">
                    {(() => {
                      const currentImageMode = getCurrentImageSource();
                      return currentImageMode === "huggingface" 
                        ? "🤖 AI is generating your unique designs..."
                        : currentImageMode === "pollinations"
                        ? "🎨 Pollinations.ai is creating your artwork..."
                        : "📸 Loading beautiful stock images...";
                    })()}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <div className={`h-2 w-2 rounded-full ${designs.length > 0 ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                      <span className="text-sm">
                        {designs.length > 0 ? '✅ Images Ready' : '⏳ Generating Images...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <div className={`h-2 w-2 rounded-full ${!isLoadingVariants ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                      <span className="text-sm">
                        {!isLoadingVariants ? '✅ Shirts Ready' : '⏳ Loading Shirts...'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-2 mt-8">
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                
                <div className="mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCurrentStep("prompt");
                      setIsGenerating(false);
                      setIsLoadingVariants(false);
                    }}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change Prompt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === "variants" && (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Regular AI Design Selection */}
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant={(() => {
                  const currentImageMode = getCurrentImageSource();
                  return currentImageMode === "stock" ? "secondary" : "default";
                })()} className="mb-2">
                  {(() => {
                    const currentImageMode = getCurrentImageSource();
                    return currentImageMode === "huggingface" 
                      ? "🤖 AI Generated Designs (Hugging Face)" 
                      : currentImageMode === "pollinations"
                      ? "🎨 AI Generated Designs (Pollinations)"
                      : "📸 Curated Stock Images";
                  })()}
                </Badge>
              </div>
              <DesignDisplay 
                designs={designs}
                onSelectDesign={handleSelectDesign}
                selectedDesign={null} // No single selected design anymore
                selectedDesigns={selectedDesigns} // Pass the array of selected designs
                designConfigs={designConfigs} // Pass the configuration for each design
                onDownloadImage={handleDownloadImage}
              />
            </div>

                {/* Configuration Modal */}
                <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                  <DialogContent className="w-[95vw] sm:w-[95vw] sm:max-w-lg max-h-[90vh] sm:h-fit sm:max-h-[90vh] overflow-hidden sm:overflow-visible flex flex-col sm:block p-4 sm:p-4">
                    <div className="space-y-1">
                      <DialogTitle className="text-lg sm:text-lg">Configure Your Shirt</DialogTitle>
                      <DialogDescription className="text-sm sm:text-sm">
                        Choose color and size for "{currentConfigDesign?.title}"
                      </DialogDescription>
                    </div>
                    
                    <div className="flex-1 sm:flex-none overflow-y-auto sm:overflow-visible">
                      {currentConfigDesign && availableVariants.length > 0 && (
                        <ConfigurationForm 
                          design={currentConfigDesign}
                          availableVariants={availableVariants}
                          onSubmit={handleConfigSubmit}
                          onCancel={() => setConfigModalOpen(false)}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Selected Designs Summary */}
                {selectedDesigns.length > 0 && (
                  <Card className="shadow-card">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4 text-center">
                        Selected Designs ({selectedDesigns.length}/3)
                      </h3>
                      
                      <div className="space-y-4">
                        {selectedDesigns.map((design, index) => {
                          const config = designConfigs[design.id];
                          return (
                            <div key={design.id} className="flex items-center gap-4 p-3 border rounded-lg">
                              <img 
                                src={design.imageUrl} 
                                alt={design.title}
                                className="w-12 h-12 rounded border object-cover"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{design.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {config ? `${config.color} • ${config.size}` : 'Configured'}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectDesign(design)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {selectedDesigns.length < 3 && (
                        <p className="text-center text-sm text-muted-foreground mt-4">
                          You can select {3 - selectedDesigns.length} more design(s)
                        </p>
                      )}
                      
                      <Button
                        variant="creative"
                        size="lg"
                        className="w-full mt-6"
                        disabled={selectedDesigns.length === 0}
                        onClick={handleCreateProduct}
                      >
                        Proceed to Payment ({selectedDesigns.length} shirt{selectedDesigns.length !== 1 ? 's' : ''})
                      </Button>
                    </CardContent>
                  </Card>
                )}
          </div>
        )}

        {currentStep === "creating" && (
          <div className="max-w-md mx-auto text-center">
            <Card className="shadow-card">
              <CardContent className="p-12 space-y-8">
                <div className="space-y-6">
                  {/* Large animated shirt logo */}
                  <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-xl shadow-lg flex items-center justify-center animate-pulse">
                    <Shirt className="h-10 w-10 text-white animate-pulse" />
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-1.5 animate-bounce">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    {/* Glowing effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-xl opacity-30 animate-ping"></div>
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold">Creating Your T-Shirt</h2>
                    <p className="text-muted-foreground mt-2">
                      Uploading your design to Printify and creating your custom product...
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="animate-pulse">Processing with Printify</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    This may take a few moments
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === "payment" && (
          (selectedShirts.length > 0 && selectedShirts.every(shirt => shirt.product)) || 
          featuredProductOrder
        ) && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="shadow-card">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-4">
                  <div className="bg-success/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      Your Shirts are Ready!
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {selectedShirts.length} custom design{selectedShirts.length > 1 ? 's' : ''} ready for order
                    </p>
                  </div>
                </div>

                {/* Shirts Preview */}
                <div className="space-y-6">
                  <h3 className="font-semibold text-center">Order Preview</h3>
                  
                  {/* Grid layout matching design selection screen */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {selectedShirts.map((shirt, index) => (
                      <div key={index} className="space-y-4">
                        {/* Design info */}
                        <div className="text-center space-y-2">
                          <h4 className="font-medium">{shirt.design.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {shirt.color} • {shirt.size} • ${(getShirtPrice() / 100).toFixed(2)}
                          </p>
                        </div>
                        
                        {/* Product Preview */}
                        {shirt.product && shirt.product.images && shirt.product.images.length > 0 && (
                          <div className="space-y-4">
                            {/* Color mismatch warning for featured products */}
                            {featuredProductOrder && (() => {
                              const selectedColor = shirt.color.toLowerCase().trim();
                              const originalColor = (featuredProductOrder.originalColor || '').toLowerCase().trim();
                              const colorsMatch = selectedColor === originalColor;
                              
                              console.log('🎨 Color comparison in payment step:');
                              console.log('  shirt.color:', shirt.color);
                              console.log('  selectedColor (processed):', selectedColor);
                              console.log('  featuredProductOrder.originalColor:', featuredProductOrder.originalColor);
                              console.log('  originalColor (processed):', originalColor);
                              console.log('  colorsMatch:', colorsMatch);
                              console.log('  featuredProductOrder exists:', !!featuredProductOrder);
                              console.log('  hasOriginalColor:', !!featuredProductOrder.originalColor);
                              
                              // Show warning if colors don't match AND we have an original color
                              if (!colorsMatch && featuredProductOrder.originalColor) {
                                return (
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                    <div className="flex items-start gap-2">
                                      <div className="text-amber-600 mt-0.5">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-amber-800 mb-1">
                                          Preview Color Notice
                                        </p>
                                        <p className="text-xs text-amber-700">
                                          Preview shows <span className="font-medium">{featuredProductOrder.originalColor}</span> but you selected <span className="font-medium">{shirt.color}</span>. Your shirt will be {shirt.color}.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            <Dialog open={isImageModalOpen && activeGalleryShirtIndex === index} onOpenChange={(open) => {
                              setIsImageModalOpen(open);
                              if (open) {
                                setActiveGalleryShirtIndex(index);
                                setSelectedProductImageIndex(0);
                              } else {
                                setActiveGalleryShirtIndex(-1);
                                setSelectedProductImageIndex(0);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <div className="aspect-square bg-gradient-subtle rounded-lg overflow-hidden border border-gray-200 relative group cursor-pointer">
                                  <img
                                    src={shirt.product.images[0]?.src}
                                    alt={shirt.product.images[0]?.alt || 'Product preview'}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                  {/* Zoom overlay */}
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-full p-3 shadow-lg">
                                      <ZoomIn className="h-6 w-6 text-gray-700" />
                                    </div>
                                  </div>
                                  {/* Gallery indicator */}
                                  {shirt.product.images.length > 1 && (
                                    <div className="absolute bottom-3 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                      +{shirt.product.images.length - 1} more
                                    </div>
                                  )}
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                                <DialogTitle className="sr-only">Product Image Gallery</DialogTitle>
                                <DialogDescription className="sr-only">View product mockup images in full size</DialogDescription>
                                <div className="relative">
                                  <img
                                    src={shirt.product.images[selectedProductImageIndex]?.src}
                                    alt="Full size product image"
                                    className="w-full h-auto max-h-[80vh] object-contain"
                                  />
                                  
                                  {/* Navigation */}
                                  {shirt.product.images.length > 1 && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProductImageIndex(
                                            selectedProductImageIndex === 0 
                                              ? shirt.product.images.length - 1 
                                              : selectedProductImageIndex - 1
                                          );
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2"
                                      >
                                        <ChevronLeft className="h-6 w-6" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProductImageIndex(
                                            (selectedProductImageIndex + 1) % shirt.product.images.length
                                          );
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2"
                                      >
                                        <ChevronRight className="h-6 w-6" />
                                      </button>
                                    </>
                                  )}
                                  
                                  {/* Image counter */}
                                  {shirt.product.images.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                                      {selectedProductImageIndex + 1} / {shirt.product.images.length}
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            <p className="text-xs text-gray-500 text-center">
                              Click to view all product images
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg">${(selectedShirts.length * (getShirtPrice() / 100)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Buttons */}
                <div className="space-y-4">
                  <Button 
                    variant="creative" 
                    size="lg" 
                    className="w-full" 
                    onClick={handleProceedToPayment}
                  >
                    <Shirt className="mr-2 h-4 w-4" />
                    Pay & Order Now - ${(selectedShirts.length * (getShirtPrice() / 100)).toFixed(2)}
                  </Button>
                  
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={handleCancelProduct}
                    >
                      Cancel & Delete Products
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1" 
                      onClick={resetApp}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Start Over
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === "stripe" && (selectedShirts.length > 0 || featuredProductOrder) && (
          <div className="max-w-2xl mx-auto">
            <StripeCheckout
              amount={featuredProductOrder 
                ? featuredProductOrder.totalPrice 
                : selectedShirts.length * (getShirtPrice() / 100)
              }
              productTitle={featuredProductOrder 
                ? featuredProductOrder.productTitle 
                : `${selectedShirts.length} Custom Shirt${selectedShirts.length > 1 ? 's' : ''}`
              }
              productDescription={featuredProductOrder 
                ? featuredProductOrder.productDescription 
                : selectedShirts.map(s => `${s.design.title} (${s.color} ${s.size})`).join(', ')
              }
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onCancel={() => setCurrentStep("payment")}
            />
          </div>
        )}

        {currentStep === "shipping" && (
          <div className="max-w-2xl mx-auto">
            <ShippingAddressForm
              onSubmit={handleShippingSubmit}
              onCancel={() => setCurrentStep("stripe")}
              isLoading={false}
            />
          </div>
        )}

        {currentStep === "success" && selectedShirts.length > 0 && shippingAddress && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="shadow-card">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-4">
                  <div className="bg-success/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Order Complete! 🎉</h2>
                    <p className="text-muted-foreground mt-2">
                      Your custom t-shirt order has been successfully placed with Printify
                    </p>
                  </div>
                </div>

                {/* Multi-shirt Order Summary */}
                <div className="space-y-6">
                  <h3 className="font-semibold">Your Shirts</h3>
                  <ul className="list-disc list-inside text-sm">
                    {selectedShirts.map((shirt, idx) => (
                      <li key={idx} className="mb-2">
                        <div className="flex items-center gap-4">
                          <img src={shirt.design.imageUrl} alt={shirt.design.title} className="w-16 h-16 rounded border" />
                          <div>
                            <div className="font-medium">{shirt.design.title}</div>
                            <div>Color: {shirt.color} | Size: {shirt.size}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-medium">Shipping To:</h4>
                  <div className="text-sm space-y-1">
                    <p>{shippingAddress.first_name} {shippingAddress.last_name}</p>
                    <p>{shippingAddress.address1}</p>
                    {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.region} {shippingAddress.zip}</p>
                    <p>{shippingAddress.country}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  <Button 
                    variant="creative" 
                    size="lg" 
                    className="w-full" 
                    onClick={resetApp}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Another T-Shirt
                  </Button>
                  
                  <div className="text-center text-sm text-muted-foreground space-y-1">
                    <p>✅ Order placed successfully with Printify</p>
                    <p>📧 Confirmation email sent to {shippingAddress.email}</p>
                    <p>📦 Estimated delivery: 7-10 business days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-background/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 AI Shirt Guy. Powered by AI art generation and Printify fulfillment.</p>
        </div>
      </div>
    </div>
      )}
    </>
  );
};

// Configuration Form Component
interface ConfigurationFormProps {
  design: Design | StockImage;
  availableVariants: any[];
  onSubmit: (color: string, size: string, variant: any) => void;
  onCancel: () => void;
}

// Function to get CSS color for shirt color names
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

function ConfigurationForm({ design, availableVariants, onSubmit, onCancel }: ConfigurationFormProps) {
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const handleSubmit = () => {
    if (selectedColor && selectedSize && selectedVariant) {
      onSubmit(selectedColor, selectedSize, selectedVariant);
      // Reset form
      setSelectedColor("");
      setSelectedSize("");
      setSelectedVariant(null);
    }
  };

  return (
    <div className="flex flex-col h-full sm:block sm:h-auto">
      {/* Scrollable Content on Mobile, Normal on Desktop */}
      <div className="flex-1 sm:flex-none space-y-4 sm:space-y-4 overflow-y-auto sm:overflow-visible">
        {/* Design Preview - Responsive */}
        <div className="flex items-center gap-3 sm:gap-3 p-3 sm:p-3 border rounded text-sm sm:text-sm">
          <img 
            src={design.imageUrl} 
            alt={design.title}
            className="w-12 h-12 sm:w-12 sm:h-12 rounded border object-cover"
          />
          <div className="sm:block">
            <h4 className="font-medium">{design.title}</h4>
            <p className="text-xs sm:text-xs text-muted-foreground">Configure this design</p>
          </div>
        </div>

        {/* Color Selection - Responsive */}
        <div className="space-y-2 sm:space-y-2">
          <h5 className="font-medium text-sm sm:text-sm">Color:</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2">
            {Array.from(new Set(availableVariants.map(v => v.options?.color).filter(Boolean))).map((color) => {
              const shirtColor = getShirtColor(color);
              const isLightColor = ['White', 'Sand', 'Daisy', 'Yellow', 'Lime', 'Light Blue'].includes(color);
              
              return (
                <Button
                  key={color}
                  variant={selectedColor === color ? "default" : "outline"}
                  size="sm"
                  className={`h-11 sm:h-9 flex items-center justify-start gap-3 text-left px-3 sm:px-3 ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedColor(color);
                    setSelectedSize("");
                    setSelectedVariant(null);
                  }}
                >
                  <div 
                    className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 ${
                      isLightColor ? 'border-gray-400' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: shirtColor }}
                  />
                  <span className="text-sm sm:text-xs truncate">{color}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Size Selection - Responsive */}
        {selectedColor && (
          <div className="space-y-2 sm:space-y-2">
            <h5 className="font-medium text-sm sm:text-sm">Size:</h5>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-2">
              {availableVariants
                .filter(v => v.options?.color === selectedColor)
                .map(v => v.options?.size)
                .filter(Boolean)
                .filter((size, index, arr) => arr.indexOf(size) === index)
                .map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    className="h-10 sm:h-8 text-sm sm:text-xs"
                    onClick={() => {
                      setSelectedSize(size);
                      const variant = availableVariants.find(v => 
                        v.options?.color === selectedColor && v.options?.size === size
                      );
                      setSelectedVariant(variant);
                    }}
                  >
                    {size}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Fixed on Mobile, Normal on Desktop */}
      <div className="flex gap-3 sm:gap-3 pt-4 sm:pt-3 mt-4 sm:mt-0 border-t sm:border-t-0 bg-white sm:bg-transparent sticky bottom-0 sm:static">
        <Button variant="outline" onClick={onCancel} className="flex-1 h-11 sm:h-10 text-sm sm:text-sm">
          Cancel
        </Button>
        <Button 
          variant="creative" 
          onClick={handleSubmit}
          disabled={!selectedColor || !selectedSize || !selectedVariant}
          className="flex-1 h-11 sm:h-10 text-sm sm:text-sm"
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
}

export default Index;
