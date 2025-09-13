import { useState, useEffect } from "react";
import { PromptInput } from "@/components/PromptInput";
import { DesignDisplay } from "@/components/DesignDisplay";
import { ShirtTemplates } from "@/components/ShirtTemplates";
import { OrderSummary } from "@/components/OrderSummary";
import { StripeCheckout } from "@/components/StripeCheckout";
import { ShippingAddressForm, type ShippingAddress } from "@/components/ShippingAddressForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Shirt, CheckCircle, ArrowLeft, Wand2, Image, Loader2, X, ZoomIn, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { generateImages, cleanupImageUrls, type GeneratedImage } from "@/services/huggingface";
import { generateStockImages, cleanupStockImages, type StockImage } from "@/services/stockImages";
import { printifyIntegration, type PrintifyProduct } from "../services/printifyIntegration";

interface Design {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
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
type ImageMode = "ai" | "stock";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>("prompt");
  const [imageMode, setImageMode] = useState<ImageMode>("stock"); // Default to stock to save credits
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [designs, setDesigns] = useState<(Design | StockImage)[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | StockImage | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ShirtTemplate | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<PrintifyProduct | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [selectedProductImageIndex, setSelectedProductImageIndex] = useState<number>(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);

  // Cleanup blob URLs when component unmounts or designs change
  useEffect(() => {
    return () => {
      if (designs.length > 0) {
        if (imageMode === "ai") {
          cleanupImageUrls(designs as GeneratedImage[]);
        } else {
          cleanupStockImages(designs as StockImage[]);
        }
      }
    };
  }, [designs, imageMode]);

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

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    
    try {
      // Step 1: Generate AI images
      if (imageMode === "ai") {
        toast.info("AI is creating your designs...");
        const generatedImages = await generateImages(prompt, 3);
        setDesigns(generatedImages);
        toast.success(`${generatedImages.length} amazing AI designs generated!`);
      } else {
        toast.info("Loading curated stock designs...");
        const stockImages = await generateStockImages(prompt, 3);
        setDesigns(stockImages);
        toast.success(`${stockImages.length} beautiful stock designs loaded!`);
      }

      // Step 2: Immediately load Printify variants
      setIsLoadingVariants(true);
      toast.info("Loading shirt options from Printify...");
      
      try {
        const variants = await printifyIntegration.getBlueprint6Variants();
        setAvailableVariants(variants);
        toast.success("Shirt options loaded!");
        setCurrentStep("variants"); // Go to variant selection step
      } catch (variantError) {
        console.error('Failed to load variants:', variantError);
        toast.error("Failed to load shirt options. Using defaults.");
        setCurrentStep("designs"); // Fallback to design selection
      } finally {
        setIsLoadingVariants(false);
      }
      
    } catch (error) {
      console.error('Error generating images:', error);
      toast.error(`Failed to generate ${imageMode === 'ai' ? 'AI' : 'stock'} designs. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectDesign = (design: Design | StockImage) => {
    setSelectedDesign(design);
    // Stay on variants step - user selects design, size, and color all on same page
  };

  const handleCreateProduct = async () => {
    if (!selectedDesign || !selectedVariant) {
      toast.error("Please select a design and variant");
      return;
    }

    setCurrentStep("creating");
    setIsCreatingProduct(true);

    try {
      toast.info("Creating your custom t-shirt with Printify...");
      
      // Create the product using Printify API
      const product = await printifyIntegration.createProductFromDesign(
        selectedDesign.imageUrl,
        selectedDesign.title,
        `Custom ${selectedDesign.title} - ${selectedColor} ${selectedSize}`,
        selectedVariant!.id
      );

      setCreatedProduct(product);
      setCurrentStep("payment"); // Show payment page with product
      setSelectedProductImageIndex(0); // Reset to first image
      toast.success("Your custom t-shirt has been created! 🎉");
      
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error("Failed to create your t-shirt. Please try again.");
      setCurrentStep("variants"); // Go back to variant selection
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

    if (!createdProduct || !selectedVariant || !paymentIntentId) {
      toast.error("Missing product, variant, or payment information");
      return;
    }

    try {
      toast.info("Processing order...");
      
      // Create order with the existing product after successful payment
      const order = await printifyIntegration.placeOrder(
        createdProduct.id,
        selectedVariant.id,
        1,
        address
      );

      toast.success("Order placed successfully! 🎉");
      setCurrentStep("success");
      
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error("Failed to process order. Please try again.");
      setCurrentStep("stripe"); // Go back to payment
    }
  };

  const handleCancelProduct = async () => {
    if (!createdProduct) {
      return;
    }

    try {
      toast.info("Canceling product...");
      
      // Delete the product from Printify
      await printifyIntegration.deleteProduct(createdProduct.id);
      
      toast.success("Product canceled successfully");
      setCreatedProduct(null);
      setCurrentStep("variants"); // Go back to variant selection
      
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error("Failed to cancel product");
    }
  };

  const resetApp = () => {
    // Cleanup previous designs before resetting
    if (designs.length > 0) {
      if (imageMode === "ai") {
        cleanupImageUrls(designs as GeneratedImage[]);
      } else {
        cleanupStockImages(designs as StockImage[]);
      }
    }
    
    setCurrentStep("prompt");
    setDesigns([]);
    setSelectedDesign(null);
    setSelectedTemplate(null);
    setSelectedColor("");
    setSelectedSize("");
    setCreatedProduct(null);
    setShippingAddress(null);
    setPaymentIntentId(null);
    setSelectedProductImageIndex(0);
    setIsImageModalOpen(false);
    setIsCreatingProduct(false);
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Shirt className="h-7 w-7 text-white" />
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-1">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">AI Shirt Guy</h1>
              </div>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-3">
                <Label htmlFor="image-mode" className="text-sm font-medium">
                  Image Mode:
                </Label>
                <div className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <Switch
                    id="image-mode"
                    checked={imageMode === "ai"}
                    onCheckedChange={(checked) => setImageMode(checked ? "ai" : "stock")}
                  />
                  <Wand2 className="h-4 w-4" />
                </div>
                <Badge variant={imageMode === "ai" ? "default" : "secondary"} className="text-xs">
                  {imageMode === "ai" ? "AI Generated" : "Stock Images"}
                </Badge>
              </div>
              
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
            {["prompt", "variants", "creating", "payment", "shipping"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step 
                    ? 'bg-primary text-primary-foreground' 
                    : index < ["prompt", "variants", "creating"].indexOf(currentStep)
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {index < ["prompt", "variants", "creating"].indexOf(currentStep) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 2 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    index < ["prompt", "variants", "creating"].indexOf(currentStep)
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
          <PromptInput 
            onGenerate={handleGenerate} 
            isGenerating={isGenerating} 
            imageMode={imageMode}
          />
        )}

        {currentStep === "variants" && (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Design Selection */}
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant={imageMode === "ai" ? "default" : "secondary"} className="mb-2">
                  {imageMode === "ai" ? "🤖 AI Generated Designs" : "📸 Curated Stock Images"}
                </Badge>
              </div>
              <DesignDisplay 
                designs={designs}
                onSelectDesign={handleSelectDesign}
                selectedDesign={selectedDesign}
                onDownloadImage={handleDownloadImage}
              />
            </div>

            {/* Variant Selection */}
            {selectedDesign && availableVariants.length > 0 && (
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-6 text-center">Select Size & Color</h3>
                  
                  {/* Selection Section */}
                  <div className="space-y-6">
                      {/* Color Selection */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Available Colors:</h4>
                        <div className="text-sm text-muted-foreground mb-2">
                          {availableVariants.length} variants loaded
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Extract unique colors from variants */}
                          {Array.from(new Set(availableVariants.map(v => v.options?.color).filter(Boolean))).map((color) => (
                            <Button
                              key={color}
                              variant={selectedColor === color ? "default" : "outline"}
                              size="sm"
                              className="h-12 flex flex-col items-center gap-1"
                              onClick={() => {
                                console.log('🎨 Color selected:', color);
                                setSelectedColor(color);
                                // Clear size when changing color to avoid mismatches
                                setSelectedSize("");
                                // Find variant with this color
                                const variant = availableVariants.find(v => v.options?.color === color);
                                if (variant) {
                                  setSelectedVariant(variant);
                                  console.log('🔵 Variant set:', variant);
                                }
                              }}
                            >
                              <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                              <span className="text-xs">{color}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Size Selection - only show if color is selected */}
                      {selectedColor && (
                        <div className="space-y-3">
                          <h4 className="font-medium">Available Sizes for {selectedColor}:</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {availableVariants
                              .filter(v => v.options?.color === selectedColor)
                              .map(v => v.options?.size)
                              .filter(Boolean)
                              .filter((size, index, arr) => arr.indexOf(size) === index) // Remove duplicates
                              .map((size) => (
                                <Button
                                  key={size}
                                  variant={selectedSize === size ? "default" : "outline"}
                                  size="sm"
                                  className="h-10"
                                  onClick={() => {
                                    console.log('📏 Size selected:', size);
                                    setSelectedSize(size);
                                    // Find exact variant with this color and size
                                    const variant = availableVariants.find(v => 
                                      v.options?.color === selectedColor && v.options?.size === size
                                    );
                                    if (variant) {
                                      setSelectedVariant(variant);
                                      console.log('🔵 Final variant set:', variant);
                                    }
                                  }}
                                >
                                  {size}
                                </Button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Loading indicator for variants */}
                      {isLoadingVariants && (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Loading shirt options...</p>
                        </div>
                      )}

                      {/* Create T-Shirt Button */}
                      <div className="pt-4">
                        <Button
                          variant="creative"
                          size="lg"
                          className="w-full"
                          disabled={!selectedDesign || !selectedColor || !selectedSize || !selectedVariant}
                          onClick={handleCreateProduct}
                        >
                          Create T-Shirt • $24.99
                        </Button>
                        {(!selectedColor || !selectedSize) && (
                          <p className="text-sm text-muted-foreground text-center mt-2">
                            Please select both color and size
                          </p>
                        )}
                      </div>
                    </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {currentStep === "creating" && (
          <div className="max-w-md mx-auto text-center">
            <Card className="shadow-card">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
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
                    <Badge variant="secondary">Processing with Printify</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    This may take a few moments
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === "creating" && (
          <div className="max-w-md mx-auto text-center">
            <Card className="shadow-card">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
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
                    <Badge variant="secondary">Processing with Printify</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    This may take a few moments
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === "payment" && createdProduct && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="shadow-card">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-4">
                  <div className="bg-success/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Your T-Shirt is Ready!</h2>
                    <p className="text-muted-foreground mt-2">
                      Your custom design has been created as a product on Printify
                    </p>
                  </div>
                </div>

                {/* Product Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Product Preview</h3>
                    {createdProduct.images && createdProduct.images.length > 0 ? (
                      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                        <DialogTrigger asChild>
                          <div className="aspect-square bg-gradient-subtle rounded-lg overflow-hidden border border-gray-200 relative group cursor-pointer">
                            <img
                              src={createdProduct.images[0]?.src}
                              alt={createdProduct.images[0]?.alt || 'Product preview'}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                            {/* Zoom overlay */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-full p-3 shadow-lg">
                                <ZoomIn className="h-6 w-6 text-gray-700" />
                              </div>
                            </div>
                            {/* Gallery indicator */}
                            {createdProduct.images.length > 1 && (
                              <div className="absolute bottom-3 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                +{createdProduct.images.length - 1} more
                              </div>
                            )}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                          <DialogTitle className="sr-only">Product Image Gallery</DialogTitle>
                          <DialogDescription className="sr-only">View product mockup images in full size</DialogDescription>
                          <div className="relative">
                            <img
                              src={createdProduct.images[selectedProductImageIndex]?.src}
                              alt="Full size product image"
                              className="w-full h-auto max-h-[80vh] object-contain"
                            />
                            
                            {/* Navigation */}
                            {createdProduct.images.length > 1 && (
                              <>
                                <button
                                  onClick={() => setSelectedProductImageIndex(
                                    selectedProductImageIndex === 0 
                                      ? createdProduct.images.length - 1 
                                      : selectedProductImageIndex - 1
                                  )}
                                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2"
                                >
                                  <ChevronLeft className="h-6 w-6" />
                                </button>
                                <button
                                  onClick={() => setSelectedProductImageIndex(
                                    (selectedProductImageIndex + 1) % createdProduct.images.length
                                  )}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2"
                                >
                                  <ChevronRight className="h-6 w-6" />
                                </button>
                              </>
                            )}
                            
                            {/* Image counter */}
                            {createdProduct.images.length > 1 && (
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                                {selectedProductImageIndex + 1} / {createdProduct.images.length}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="aspect-square bg-gradient-subtle rounded-lg flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Product image generating...</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 text-center">
                      Click to view all product images
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Product Details</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Title:</span> {createdProduct.title}</p>
                      <p><span className="font-medium">Color:</span> {selectedColor}</p>
                      <p><span className="font-medium">Size:</span> {selectedSize}</p>
                      <p><span className="font-medium">Price:</span> $24.99</p>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Product Gallery</h4>
                      <p className="text-sm text-muted-foreground">
                        {createdProduct.images ? 
                          `${createdProduct.images.length} product views available` :
                          'Images generating...'
                        }
                      </p>
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
                    Pay & Order Now - $24.99
                  </Button>
                  
                  {/* Development/Testing Button */}
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full border-dashed border-orange-300 text-orange-600 hover:bg-orange-50" 
                    onClick={handleDevFreePayment}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Dev Free Payment (Skip Stripe)
                  </Button>
                  
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={handleCancelProduct}
                    >
                      Cancel & Delete Product
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

                <div className="text-center text-sm text-muted-foreground">
                  <p>Choose "Pay & Order Now" for real Stripe payment or "Dev Free Payment" for testing</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === "stripe" && createdProduct && selectedDesign && (
          <div className="max-w-2xl mx-auto">
            <StripeCheckout
              amount={24.99}
              productTitle={createdProduct.title}
              productDescription={`Custom ${selectedDesign.title} - ${selectedColor} ${selectedSize}`}
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

        {currentStep === "success" && createdProduct && shippingAddress && (
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

                {/* Order Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Your Order</h3>
                    {createdProduct.images && createdProduct.images.length > 0 ? (
                      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                        <DialogTrigger asChild>
                          <div className="aspect-square bg-gradient-subtle rounded-lg overflow-hidden border border-gray-200 relative group cursor-pointer">
                            <img
                              src={createdProduct.images[0]?.src}
                              alt={createdProduct.images[0]?.alt || 'Ordered product'}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                            {/* Zoom overlay */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white rounded-full p-3 shadow-lg">
                                <ZoomIn className="h-6 w-6 text-gray-700" />
                              </div>
                            </div>
                            {/* Gallery indicator */}
                            {createdProduct.images.length > 1 && (
                              <div className="absolute bottom-3 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                +{createdProduct.images.length - 1} more
                              </div>
                            )}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                          <DialogTitle className="sr-only">Order Product Images</DialogTitle>
                          <DialogDescription className="sr-only">View order product images in full size</DialogDescription>
                          <div className="relative">
                            <img
                              src={createdProduct.images[selectedProductImageIndex]?.src}
                              alt="Full size product image"
                              className="w-full h-auto max-h-[80vh] object-contain"
                            />
                            
                            {/* Navigation */}
                            {createdProduct.images.length > 1 && (
                              <>
                                <button
                                  onClick={() => setSelectedProductImageIndex(
                                    selectedProductImageIndex === 0 
                                      ? createdProduct.images.length - 1 
                                      : selectedProductImageIndex - 1
                                  )}
                                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2"
                                >
                                  <ChevronLeft className="h-6 w-6" />
                                </button>
                                <button
                                  onClick={() => setSelectedProductImageIndex(
                                    (selectedProductImageIndex + 1) % createdProduct.images.length
                                  )}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2"
                                >
                                  <ChevronRight className="h-6 w-6" />
                                </button>
                              </>
                            )}
                            
                            {/* Image counter */}
                            {createdProduct.images.length > 1 && (
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                                {selectedProductImageIndex + 1} / {createdProduct.images.length}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="aspect-square bg-gradient-subtle rounded-lg flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Product images generated</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 text-center">
                      Click to view all product images
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Order Details</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Product:</span> {createdProduct.title}</p>
                      <p><span className="font-medium">Color:</span> {selectedColor}</p>
                      <p><span className="font-medium">Size:</span> {selectedSize}</p>
                      <p><span className="font-medium">Price:</span> $24.99</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Status:</span> 
                        <Badge variant="secondary">Processing</Badge>
                      </div>
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
  );
};

export default Index;
