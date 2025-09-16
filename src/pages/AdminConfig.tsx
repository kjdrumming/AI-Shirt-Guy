import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, RefreshCw, Lock, Unlock, Search, ExternalLink, Star, Trash2, Image } from "lucide-react";
import { toast } from "sonner";
import { 
  getAdminConfig, 
  getLocalAdminSettings, 
  saveLocalAdminSettings,
  updateGlobalAdminConfig,
  type AdminConfig 
} from "@/lib/adminConfig";
import { PromptInput, type ImageShape, type AspectRatio } from "@/components/PromptInput";
import { DesignDisplay } from "@/components/DesignDisplay";
import { generateImages, cleanupImageUrls, type GeneratedImage } from "@/services/huggingface";
import { pollinationsService } from "@/services/pollinations";
import { generateStockImages, cleanupStockImages, type StockImage } from "@/services/stockImages";

interface LocalAdminSettings {
  adminPassword: string;
  printifyApiToken: string;
}

interface Blueprint {
  id: number;
  title: string;
  brand: string;
  model: string;
  images: any[];
}

interface PrintProvider {
  id: number;
  title: string;
  location?: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  image: {
    src: string;
    variant_ids: number[];
    position: string;
    is_default: boolean;
    is_selected_for_publishing: boolean;
    order: number | null;
  } | null;
  price: number | null;
  created_at: string;
}const AdminConfigPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [globalConfig, setGlobalConfig] = useState<AdminConfig>({
    imageSource: "pollinations",
    debugMode: false,
    maxDesignsPerGeneration: 3,
    enableMultiShirtSelection: true,
    customPromptSuggestions: [],
    maintenanceMode: false,
    shirtPrice: 2499,
    blueprintId: 12, // Use the same blueprint ID as the server config
    printProviderId: 103,
    featuredProducts: []
  });
  const [localSettings, setLocalSettings] = useState<LocalAdminSettings>({
    adminPassword: "admin123",
    printifyApiToken: ""
  });
  const [newPromptSuggestion, setNewPromptSuggestion] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Search state for catalog
  const [blueprintSearchQuery, setBlueprintSearchQuery] = useState("");
  const [blueprintSearchResults, setBlueprintSearchResults] = useState<Blueprint[]>([]);
  const [blueprintSearchLoading, setBlueprintSearchLoading] = useState(false);
  const [providerSearchQuery, setProviderSearchQuery] = useState("");
  const [providerSearchResults, setProviderSearchResults] = useState<PrintProvider[]>([]);
  const [providerSearchLoading, setProviderSearchLoading] = useState(false);
  const [selectedBlueprintForProviders, setSelectedBlueprintForProviders] = useState<number>(6);

  // Product selection state
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableProductsLoading, setAvailableProductsLoading] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState("create");

  // Admin AI shirt creation state (matching main UI)
  const [designs, setDesigns] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Modal configuration state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [currentConfigDesign, setCurrentConfigDesign] = useState<any>(null);
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  
  // Cart state (matching main UI)
  const [selectedDesigns, setSelectedDesigns] = useState<any[]>([]);
  const [designConfigs, setDesignConfigs] = useState<any>({});
  const [isCreatingShirts, setIsCreatingShirts] = useState(false);
  const [createdProducts, setCreatedProducts] = useState<any[]>([]);

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; title: string } | null>(null);

  // Load config from backend and local settings on component mount
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        // Load global config from backend
        const globalConfigData = await getAdminConfig();
        setGlobalConfig(globalConfigData);
        
        // Load local settings from localStorage
        const localSettingsData = getLocalAdminSettings();
        setLocalSettings(localSettingsData);

        // Load available products (use cache on initial load)
        await loadAvailableProducts(false);
      } catch (error) {
        console.error('Failed to load admin configs:', error);
        toast.error('Failed to load configuration');
      }
    };
    
    loadConfigs();
  }, []);

  // Load available products for selection
  const loadAvailableProducts = async (forceRefresh = false) => {
    console.log('🔄 Load Available Products clicked, current loading state:', availableProductsLoading);
    if (availableProductsLoading) {
      console.log('⚠️ Already loading, skipping request');
      return;
    }
    
    setAvailableProductsLoading(true);
    console.log('🔄 Set loading state to true');
    
    try {
      // Add refresh parameter to force cache refresh only when explicitly requested
      const url = forceRefresh ? '/api/products/all-products?refresh=true' : '/api/products/all-products';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data.data || []);
        console.log('✅ Loaded available products for selection:', data.data?.length || 0);
        
        // Show rate limit message if applicable
        if (data.message && data.rateLimited) {
          toast.info(data.message);
        }
      } else if (response.status === 429) {
        let errorData: { rateLimited?: boolean; error?: string } = {};
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If response isn't JSON (e.g., from Printify API), create fallback
          console.log('429 response is not JSON, using fallback');
        }
        
        console.error('Rate limited:', response.status, errorData);
        
        if (errorData.rateLimited) {
          toast.warning(errorData.error || 'Please wait before refreshing again');
        } else {
          toast.warning('Rate limit reached. Please wait a moment before refreshing again.');
        }
      } else {
        console.error('Failed to load products:', response.status);
        toast.error('Failed to load available products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error loading available products');
    } finally {
      setAvailableProductsLoading(false);
      console.log('🔄 Set loading state to false');
    }
  };

  // Delete a product
  const deleteProduct = async (productId: string, productTitle: string) => {
    console.log('🗑️ Delete product clicked:', productId);
    
    // Show custom confirmation modal
    setProductToDelete({ id: productId, title: productTitle });
    setDeleteConfirmOpen(true);
  };

  // Confirm delete product
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    const productId = productToDelete.id;
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('✅ Product deleted successfully:', productId);
        toast.success('Product deleted successfully');
        
        // Remove the product from the local state
        setAvailableProducts(prev => prev.filter(product => product.id !== productId));
        
        // Also remove from featured products if it was featured
        if (globalConfig.featuredProducts?.includes(productId)) {
          const newFeaturedProducts = globalConfig.featuredProducts.filter(id => id !== productId);
          setGlobalConfig(prev => ({ ...prev, featuredProducts: newFeaturedProducts }));
          
          // Update the server config
          await updateGlobalAdminConfig({ featuredProducts: newFeaturedProducts }, localSettings.adminPassword);
        }
        
        // Product is already removed from local state, no need to refresh automatically
        console.log('✅ Product deleted and removed from local state. Manual refresh available if needed.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete product:', response.status, errorData);
        toast.error(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    } finally {
      // Close the modal and reset state
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    }
  };

  // Cancel delete product
  const cancelDeleteProduct = () => {
    console.log('❌ Product deletion cancelled by user');
    setDeleteConfirmOpen(false);
    setProductToDelete(null);
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setGlobalConfig(prev => {
      const isSelected = prev.featuredProducts.includes(productId);
      const newFeaturedProducts = isSelected
        ? prev.featuredProducts.filter(id => id !== productId)
        : [...prev.featuredProducts, productId];
      
      return {
        ...prev,
        featuredProducts: newFeaturedProducts
      };
    });
  };

  // Clear all featured products
  const clearAllFeaturedProducts = () => {
    setGlobalConfig(prev => ({
      ...prev,
      featuredProducts: []
    }));
    toast.success('All featured products cleared');
  };

  // Save config to backend and local settings
  const saveConfig = async () => {
    setIsSaving(true);
    try {
      // Save global config to backend
      await updateGlobalAdminConfig(globalConfig, localSettings.adminPassword);
      
      // Save local settings to localStorage
      saveLocalAdminSettings(localSettings);
      
      toast.success("Configuration saved successfully!");
    } catch (error) {
      toast.error("Failed to save configuration: " + (error as Error).message);
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Authentication check
  const handleAuth = () => {
    if (password === localSettings.adminPassword) {
      setIsAuthenticated(true);
      toast.success("Admin access granted");
    } else {
      toast.error("Invalid password");
      setPassword("");
    }
  };

  // Add new prompt suggestion
  const addPromptSuggestion = () => {
    if (newPromptSuggestion.trim()) {
      setGlobalConfig(prev => ({
        ...prev,
        customPromptSuggestions: [...prev.customPromptSuggestions, newPromptSuggestion.trim()]
      }));
      setNewPromptSuggestion("");
    }
  };

  // Remove prompt suggestion
  const removePromptSuggestion = (index: number) => {
    setGlobalConfig(prev => ({
      ...prev,
      customPromptSuggestions: prev.customPromptSuggestions.filter((_, i) => i !== index)
    }));
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setGlobalConfig({
      imageSource: "pollinations",
      debugMode: false,
      maxDesignsPerGeneration: 3,
      enableMultiShirtSelection: true,
      customPromptSuggestions: [],
      maintenanceMode: false,
      shirtPrice: 2499,
      blueprintId: 6,
      printProviderId: 103,
      featuredProducts: []
    });
    setLocalSettings({
      adminPassword: "admin123",
      printifyApiToken: ""
    });
    toast.success("Configuration reset to defaults");
  };

  // Search functions
  const searchBlueprints = async () => {
    if (!blueprintSearchQuery.trim()) return;
    
    setBlueprintSearchLoading(true);
    try {
      const response = await fetch(`/api/catalog/blueprints/search?query=${encodeURIComponent(blueprintSearchQuery)}`);
      if (response.ok) {
        const results = await response.json();
        setBlueprintSearchResults(results.blueprints || []);
      } else {
        toast.error('Failed to search blueprints');
      }
    } catch (error) {
      console.error('Blueprint search error:', error);
      toast.error('Failed to search blueprints');
    }
    setBlueprintSearchLoading(false);
  };

  const searchProviders = async () => {
    if (!providerSearchQuery.trim()) return;
    
    setProviderSearchLoading(true);
    try {
      const response = await fetch(`/api/catalog/blueprints/${encodeURIComponent(providerSearchQuery)}/providers/search`);
      if (response.ok) {
        const results = await response.json();
        setProviderSearchResults(results.printProviders || []);
      } else {
        toast.error('Failed to search print providers');
      }
    } catch (error) {
      console.error('Provider search error:', error);
      toast.error('Failed to search print providers');
    }
    setProviderSearchLoading(false);
  };

  const useBlueprint = (blueprint: Blueprint) => {
    setGlobalConfig(prev => ({
      ...prev,
      blueprintId: blueprint.id
    }));
    toast.success(`Using blueprint: ${blueprint.title}`);
  };

  const useProvider = (provider: PrintProvider) => {
    setGlobalConfig(prev => ({
      ...prev,
      printProviderId: provider.id
    }));
    toast.success(`Using print provider: ${provider.title}`);
  };

  // Function to preload images and wait for them to be ready (matching main UI)
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

  // Admin shirt creation functions (matching main UI workflow)
  const handleGenerateDesigns = async (prompt: string, shape: ImageShape, aspectRatio: AspectRatio) => {
    setIsGenerating(true);
    setDesigns([]);
    
    try {
      // Use the same service logic as the main UI (Index.tsx)
      const currentImageMode = globalConfig.imageSource;
      
      if (currentImageMode === "huggingface") {
        toast.info("AI is creating your designs...");
        const maxDesigns = globalConfig.maxDesignsPerGeneration;
        const generatedImages = await generateImages(prompt, shape, aspectRatio, maxDesigns);
        
        // Transform to match admin interface Design structure
        const transformedDesigns = generatedImages.map((img, index) => ({
          id: `admin-hf-${Date.now()}-${index}`,
          imageUrl: img.imageUrl,
          title: `Admin Design ${index + 1}`,
          prompt: img.prompt,
          originalPrompt: img.originalPrompt,
          shape,
          aspectRatio
        }));
        
        // Wait for images to actually load (matching main UI behavior)
        toast.info("Loading images...");
        await preloadImages(transformedDesigns.map(design => design.imageUrl));
        
        setDesigns(transformedDesigns);
        toast.success(`${transformedDesigns.length} amazing AI designs ready!`);
        
      } else if (currentImageMode === "pollinations") {
        toast.info("Pollinations.ai is creating your designs...");
        const maxDesigns = globalConfig.maxDesignsPerGeneration;
        const pollinationsImages = await pollinationsService.generateImages(prompt, shape, aspectRatio, maxDesigns);
        
        // Transform to match admin interface Design structure
        const transformedDesigns = pollinationsImages.map((img, index) => ({
          id: `admin-poll-${Date.now()}-${index}`,
          imageUrl: img.imageUrl,
          title: `Admin Design ${index + 1}`,
          prompt: img.prompt,
          originalPrompt: img.originalPrompt,
          shape,
          aspectRatio
        }));
        
        // Wait for images to actually load (matching main UI behavior)
        toast.info("Loading images...");
        await preloadImages(transformedDesigns.map(design => design.imageUrl));
        
        setDesigns(transformedDesigns);
        toast.success(`${transformedDesigns.length} beautiful AI designs ready!`);
        
      } else {
        toast.info("Loading curated stock designs...");
        const maxDesigns = globalConfig.maxDesignsPerGeneration;
        const stockImages = await generateStockImages(prompt, shape, aspectRatio, maxDesigns);
        
        // Transform to match admin interface Design structure
        const transformedDesigns = stockImages.map((img, index) => ({
          id: `admin-stock-${Date.now()}-${index}`,
          imageUrl: img.imageUrl,
          title: `Admin Design ${index + 1}`,
          prompt: img.prompt,
          originalPrompt: img.originalPrompt,
          shape,
          aspectRatio
        }));
        
        // Wait for images to actually load (matching main UI behavior)
        toast.info("Loading images...");
        await preloadImages(transformedDesigns.map(design => design.imageUrl));
        
        setDesigns(transformedDesigns);
        toast.success(`${transformedDesigns.length} beautiful stock designs ready!`);
      }
      
    } catch (error) {
      console.error('Design generation error:', error);
      const currentImageMode = globalConfig.imageSource;
      const modeLabel = currentImageMode === "huggingface" ? "Hugging Face AI" : 
                       currentImageMode === "pollinations" ? "Pollinations AI" : "stock";
      toast.error(`Failed to generate ${modeLabel} designs. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Modal functions for size/color configuration (matching main UI)
  const handleDesignConfigure = (design: any) => {
    setCurrentConfigDesign(design);
    setConfigModalOpen(true);
    
    // Fetch variants if not already loaded
    if (availableVariants.length === 0) {
      fetchVariants();
    }
  };

  const fetchVariants = async () => {
    try {
      const { printifyIntegration } = await import('../services/printifyIntegration');
      // Use the current blueprint configuration instead of hardcoded blueprint 6
      const variants = await printifyIntegration.getBlueprint6Variants(); // This actually uses getBlueprintId() internally
      setAvailableVariants(variants);
    } catch (error) {
      console.error('Failed to load variants:', error);
      toast.error("Failed to load shirt options. Please try again.");
    }
  };

  const handleConfigSubmit = (color: string, size: string, variant: any) => {
    if (currentConfigDesign) {
      // Add design to selected list with configuration (matching main UI)
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

  const handleConfigCancel = () => {
    setConfigModalOpen(false);
    setCurrentConfigDesign(null);
  };

  // Create shirts function - bulk order with Printify
  const handleCreateShirts = async () => {
    if (selectedDesigns.length === 0) {
      toast.error("No designs selected");
      return;
    }

    setIsCreatingShirts(true);
    const createdShirts: any[] = [];

    try {
      toast.info(`Creating ${selectedDesigns.length} shirt${selectedDesigns.length > 1 ? 's' : ''} with Printify...`);

      // Process each design
      for (const design of selectedDesigns) {
        const config = designConfigs[design.id];
        if (!config) {
          console.error(`No configuration found for design ${design.id}`);
          continue;
        }

        try {
          // Create product with Printify using the actual variant ID and shape/aspect ratio
          const response = await fetch('/api/products/create-admin-product', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              designUrl: design.imageUrl,
              shirtTemplate: config.color.toLowerCase(),
              prompt: design.prompt || design.title,
              blueprintId: globalConfig.blueprintId,
              printProviderId: globalConfig.printProviderId,
              price: globalConfig.shirtPrice,
              variantId: config.variant.id,
              shape: design.shape || 'square',
              aspectRatio: design.aspectRatio || '1:1'
            }),
          });

          if (response.ok) {
            const result = await response.json();
            createdShirts.push({
              design,
              config,
              product: result.product,
              success: true
            });
            toast.success(`Created: ${design.title} (${config.color} ${config.size})`);
          } else {
            const errorData = await response.json();
            console.error(`Failed to create product for ${design.title}:`, errorData);
            createdShirts.push({
              design,
              config,
              error: errorData.error || 'Unknown error',
              success: false
            });
            toast.error(`Failed to create: ${design.title} - ${errorData.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error(`Error creating product for ${design.title}:`, error);
          createdShirts.push({
            design,
            config,
            error: 'Network error',
            success: false
          });
          toast.error(`Error creating: ${design.title} - Network error`);
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update state with results
      setCreatedProducts(createdShirts);
      
      const successCount = createdShirts.filter(shirt => shirt.success).length;
      const failCount = createdShirts.filter(shirt => !shirt.success).length;

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} shirt${successCount > 1 ? 's' : ''}!`);
      }
      
      if (failCount > 0) {
        toast.error(`${failCount} shirt${failCount > 1 ? 's' : ''} failed to create`);
      }

      // Clear the cart after processing
      if (successCount === selectedDesigns.length) {
        setSelectedDesigns([]);
        setDesignConfigs({});
        toast.info("Cart cleared. All designs processed successfully!");
      }

    } catch (error) {
      console.error('Bulk order error:', error);
      toast.error('Failed to process bulk order');
    } finally {
      setIsCreatingShirts(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Admin Configuration</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter admin password to access configuration
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                placeholder="Enter admin password"
              />
            </div>
            <Button onClick={handleAuth} className="w-full">
              <Unlock className="h-4 w-4 mr-2" />
              Access Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold">Admin Configuration</h1>
              <p className="text-sm text-muted-foreground">
                Manage application settings and preferences
              </p>
            </div>
          </div>
          <Button onClick={() => setIsAuthenticated(false)} variant="outline" className="w-full sm:w-auto">
            Logout
          </Button>
        </div>

        {/* Tabs Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-auto min-h-[2.5rem] w-full justify-start overflow-x-auto flex-nowrap gap-1 p-1">
            <TabsTrigger value="general" className="text-xs whitespace-nowrap flex-shrink-0">
              General
            </TabsTrigger>
            <TabsTrigger value="features" className="text-xs whitespace-nowrap flex-shrink-0">
              Features
            </TabsTrigger>
            <TabsTrigger value="printify" className="text-xs whitespace-nowrap flex-shrink-0">
              Printify
            </TabsTrigger>
            <TabsTrigger value="prompts" className="text-xs whitespace-nowrap flex-shrink-0">
              Prompts
            </TabsTrigger>
            <TabsTrigger value="api" className="text-xs whitespace-nowrap flex-shrink-0">
              API
            </TabsTrigger>
            <TabsTrigger value="catalog" className="text-xs whitespace-nowrap flex-shrink-0">
              Catalog
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs whitespace-nowrap flex-shrink-0">
              Products
            </TabsTrigger>
            <TabsTrigger value="create" className="text-xs whitespace-nowrap flex-shrink-0">
              Create
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Image Generation Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure the default image source for AI design generation
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="imageSource">Default Image Source</Label>
                  <Select
                    value={globalConfig.imageSource}
                    onValueChange={(value: "stock" | "huggingface" | "pollinations") => 
                      setGlobalConfig(prev => ({ ...prev, imageSource: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock Images (Free)</SelectItem>
                      <SelectItem value="huggingface">Hugging Face AI (Uses Credits)</SelectItem>
                      <SelectItem value="pollinations">Pollinations.ai (Free AI)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be the default image source hidden from users
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxDesigns">Max Designs Per Generation</Label>
                  <Input
                    id="maxDesigns"
                    type="number"
                    min="1"
                    max="10"
                    value={globalConfig.maxDesignsPerGeneration}
                    onChange={(e) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      maxDesignsPerGeneration: parseInt(e.target.value) || 3 
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature Configuration Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enable or disable application features
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Multi-Shirt Selection</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to select up to 3 designs per order
                    </p>
                  </div>
                  <Switch
                    checked={globalConfig.enableMultiShirtSelection}
                    onCheckedChange={(checked) => 
                      setGlobalConfig(prev => ({ ...prev, enableMultiShirtSelection: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Debug Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Show detailed console logs and error information
                    </p>
                  </div>
                  <Switch
                    checked={globalConfig.debugMode}
                    onCheckedChange={(checked) => 
                      setGlobalConfig(prev => ({ ...prev, debugMode: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable the application for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={globalConfig.maintenanceMode}
                    onCheckedChange={(checked) => 
                      setGlobalConfig(prev => ({ ...prev, maintenanceMode: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Printify Configuration Tab */}
          <TabsContent value="printify" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Printify Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure shirt pricing and Printify product settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shirtPrice">Shirt Price (in cents)</Label>
                  <Input
                    id="shirtPrice"
                    type="number"
                    min="100"
                    max="100000"
                    value={globalConfig.shirtPrice}
                    onChange={(e) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      shirtPrice: parseInt(e.target.value) || 2499 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Price in cents (e.g., 2499 = $24.99)
                  </p>
                </div>

                <div>
                  <Label htmlFor="blueprintId">Blueprint ID</Label>
                  <Input
                    id="blueprintId"
                    type="number"
                    min="1"
                    value={globalConfig.blueprintId}
                    onChange={(e) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      blueprintId: parseInt(e.target.value) || 6 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Printify blueprint ID for the shirt type (e.g., 6 for standard t-shirt)
                  </p>
                </div>

                <div>
                  <Label htmlFor="printProviderId">Print Provider ID</Label>
                  <Input
                    id="printProviderId"
                    type="number"
                    min="1"
                    value={globalConfig.printProviderId}
                    onChange={(e) => setGlobalConfig(prev => ({ 
                      ...prev, 
                      printProviderId: parseInt(e.target.value) || 103 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Printify print provider ID (e.g., 103 for standard provider)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Prompt Suggestions Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Prompt Suggestions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add custom prompt suggestions for users
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newPromptSuggestion}
                    onChange={(e) => setNewPromptSuggestion(e.target.value)}
                    placeholder="Enter a new prompt suggestion..."
                    onKeyPress={(e) => e.key === 'Enter' && addPromptSuggestion()}
                  />
                  <Button onClick={addPromptSuggestion}>Add</Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {globalConfig.customPromptSuggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => removePromptSuggestion(index)}
                    >
                      {suggestion} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Configuration Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure external API settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="printifyToken">Printify API Token</Label>
                  <Input
                    id="printifyToken"
                    type="password"
                    value={localSettings.printifyApiToken}
                    onChange={(e) => setLocalSettings(prev => ({ 
                      ...prev, 
                      printifyApiToken: e.target.value 
                    }))}
                    placeholder="Enter Printify API token"
                  />
                </div>

                <div>
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={localSettings.adminPassword}
                    onChange={(e) => setLocalSettings(prev => ({ 
                      ...prev, 
                      adminPassword: e.target.value 
                    }))}
                    placeholder="Set admin password"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Catalog Search Tab */}
          <TabsContent value="catalog" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Catalog Search
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Search Printify catalog for blueprints and print providers
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Blueprint Search */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Search Blueprints</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by title or brand (e.g., 'Unisex', 'Bella')"
                      value={blueprintSearchQuery}
                      onChange={(e) => setBlueprintSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchBlueprints()}
                    />
                    <Button 
                      onClick={searchBlueprints} 
                      disabled={blueprintSearchLoading || !blueprintSearchQuery.trim()}
                    >
                      {blueprintSearchLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {blueprintSearchResults.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {blueprintSearchResults.map((blueprint: Blueprint) => (
                        <div key={blueprint.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{blueprint.title}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {blueprint.id} | Brand: {blueprint.brand}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => useBlueprint(blueprint)}
                            className="ml-2"
                          >
                            Use This
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="border-t pt-6">
                  {/* Print Provider Search */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Search Print Providers</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter Blueprint ID (e.g., '6')"
                        value={providerSearchQuery}
                        onChange={(e) => setProviderSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchProviders()}
                      />
                      <Button 
                        onClick={searchProviders} 
                        disabled={providerSearchLoading || !providerSearchQuery.trim()}
                      >
                        {providerSearchLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {providerSearchResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {providerSearchResults.map((provider: PrintProvider) => (
                          <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{provider.title}</p>
                              <p className="text-sm text-muted-foreground">
                                ID: {provider.id} | Location: {provider.location || 'N/A'}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => useProvider(provider)}
                              className="ml-2"
                            >
                              Use This
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Featured Products Management Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Featured Products Management
                </CardTitle>
                <CardDescription>
                  Select which products to feature on the homepage. Products will appear in the order selected.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Load Products Button */}
                <div className="space-y-3">
                  <Button 
                    onClick={() => {
                      console.log('🖱️ Load Available Products button clicked, loading state:', availableProductsLoading);
                      loadAvailableProducts(true); // Force refresh when button is clicked
                    }} 
                    disabled={availableProductsLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {availableProductsLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing Products...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Available Products
                      </>
                    )}
                  </Button>
                </div>

                {/* Product Selection */}
                <div className="space-y-4">
                  {availableProducts.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">
                          Select Products to Feature ({globalConfig.featuredProducts?.length || 0}/5 selected)
                        </Label>
                        <Button 
                          onClick={clearAllFeaturedProducts}
                          variant="outline"
                          size="sm"
                          disabled={!globalConfig.featuredProducts?.length}
                        >
                          Clear All
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-[60vh] min-h-[400px] overflow-y-auto border rounded-lg p-3 bg-gray-50/50">
                        {availableProducts.map((product) => (
                          <div 
                            key={product.id} 
                            className={`flex items-center gap-3 p-3 border rounded-lg transition-colors w-full ${
                              globalConfig.featuredProducts?.includes(product.id) 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'hover:bg-gray-50 bg-white'
                            }`}
                          >
                            <div className="flex-shrink-0">
                              <Checkbox
                                checked={globalConfig.featuredProducts?.includes(product.id) || false}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                                disabled={
                                  !globalConfig.featuredProducts?.includes(product.id) && 
                                  (globalConfig.featuredProducts?.length || 0) >= 5
                                }
                              />
                            </div>
                            
                            {/* Product Image */}
                            {product.image?.src && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={product.image.src} 
                                  alt={product.title}
                                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border shadow-sm"
                                />
                              </div>
                            )}
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium truncate text-sm sm:text-base">{product.title}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                ID: {product.id}
                              </p>
                              {product.price && (
                                <p className="text-xs sm:text-sm font-medium text-green-600">
                                  ${(product.price / 100).toFixed(2)}
                                </p>
                              )}
                            </div>
                            
                            {/* Delete Button */}
                            <div className="flex-shrink-0 ml-2">
                              <Button
                                onClick={() => deleteProduct(product.id, product.title)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                title="Delete Product"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    !availableProductsLoading && (
                      <p className="text-center text-muted-foreground py-4">
                        No products loaded yet. Click "Load Available Products" to see your shop's products.
                      </p>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Shirts Tab - Exact replica of main UI */}
          <TabsContent value="create" className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Admin AI Shirt Creation</h2>
              <p className="text-muted-foreground">
                Use the same interface as users to create and test designs
              </p>
            </div>

            {/* Step 1: AI Prompt Input (same as main UI) */}
            <PromptInput 
              onGenerate={handleGenerateDesigns}
              isGenerating={isGenerating}
            />

            {/* Step 2: Design Display (same as main UI) */}
            {designs.length > 0 && (
              <DesignDisplay
                designs={designs}
                onSelectDesign={handleDesignConfigure}
                selectedDesign={null}
              />
            )}

            {/* Step 3: Selected Designs Cart (same as main UI) */}
            {selectedDesigns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Continue to Shirt Configuration
                  </CardTitle>
                  <CardDescription>
                    Your selected designs ({selectedDesigns.length}/3)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    {selectedDesigns.map((design) => {
                      const config = designConfigs[design.id];
                      return (
                        <div key={design.id} className="flex items-center gap-4 p-4 border rounded-lg">
                          <img 
                            src={design.imageUrl} 
                            alt={design.title}
                            className="w-16 h-16 rounded border object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium">{design.title}</h4>
                            {config && (
                              <p className="text-sm text-muted-foreground">
                                {config.color} • {config.size}
                              </p>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedDesigns(prev => prev.filter(d => d.id !== design.id));
                              setDesignConfigs(prev => {
                                const newConfigs = { ...prev };
                                delete newConfigs[design.id];
                                return newConfigs;
                              });
                              toast.success("Design removed from cart");
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Ready to create {selectedDesigns.length} shirt{selectedDesigns.length > 1 ? 's' : ''} with Printify
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={handleCreateShirts}
                      disabled={isCreatingShirts}
                    >
                      {isCreatingShirts ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating Shirts...
                        </>
                      ) : (
                        "Create Shirts"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Created Products Results */}
            {createdProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Created Products Results
                  </CardTitle>
                  <CardDescription>
                    Bulk order results from Printify
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    {createdProducts.map((result, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center gap-4 p-4 border rounded-lg ${
                          result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <img 
                          src={result.design.imageUrl} 
                          alt={result.design.title}
                          className="w-16 h-16 rounded border object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{result.design.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {result.config.color} • {result.config.size}
                          </p>
                          {result.success ? (
                            <p className="text-sm text-green-600">
                              ✅ Successfully created (ID: {result.product?.id})
                            </p>
                          ) : (
                            <p className="text-sm text-red-600">
                              ❌ Failed: {result.error}
                            </p>
                          )}
                        </div>
                        {result.success && result.product && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`https://printify.com/app/products/${result.product.id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View in Printify
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {createdProducts.filter(r => r.success).length} successful, {createdProducts.filter(r => !r.success).length} failed
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setCreatedProducts([])}
                        size="sm"
                      >
                        Clear Results
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Configuration Display */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Current Configuration:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Image Source: {globalConfig.imageSource}</p>
                  <p>Max Designs: {globalConfig.maxDesignsPerGeneration}</p>
                  <p>Blueprint ID: {globalConfig.blueprintId}</p>
                  <p>Print Provider ID: {globalConfig.printProviderId}</p>
                  <p>Price: ${(globalConfig.shirtPrice / 100).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={saveConfig} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
          
          <Button onClick={resetToDefaults} variant="outline">
            Reset to Defaults
          </Button>
        </div>

        {/* Access Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">
              <strong>Access this page:</strong> Navigate directly to /admin-config or add #admin to any URL
            </p>
          </CardContent>
        </Card>

        {/* Configuration Modal (matching main UI) */}
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="sm:max-w-md h-[90vh] sm:h-auto flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Choose color and size for "{currentConfigDesign?.title}"
              </DialogTitle>
              <DialogDescription>
                Configure the shirt color and size for this design before adding it to your cart.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              {currentConfigDesign && availableVariants.length > 0 && (
                <ConfigurationForm
                  design={currentConfigDesign}
                  availableVariants={availableVariants}
                  onSubmit={handleConfigSubmit}
                  onCancel={handleConfigCancel}
                />
              )}
              {availableVariants.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading shirt options...</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog 
          open={deleteConfirmOpen} 
          onOpenChange={(open) => {
            if (!open) {
              // If modal is being closed, cancel the deletion
              cancelDeleteProduct();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Product
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Are you sure you want to delete this product?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {productToDelete && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="font-medium text-sm">{productToDelete.title}</p>
                  <p className="text-xs text-muted-foreground">ID: {productToDelete.id}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={cancelDeleteProduct}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteProduct}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Configuration Form Component
interface ConfigurationFormProps {
  design: any;
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
          variant="default" 
          onClick={handleSubmit}
          disabled={!selectedColor || !selectedSize || !selectedVariant}
          className="flex-1 h-11 sm:h-10 text-sm sm:text-sm"
        >
          Configure
        </Button>
      </div>
    </div>
  );
}

export default AdminConfigPage;