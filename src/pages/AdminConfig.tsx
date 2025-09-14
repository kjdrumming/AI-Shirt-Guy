import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, RefreshCw, Lock, Unlock, Search, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import { 
  getAdminConfig, 
  getLocalAdminSettings, 
  saveLocalAdminSettings,
  updateGlobalAdminConfig,
  type AdminConfig 
} from "@/lib/adminConfig";

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
    blueprintId: 6,
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

        // Load available products
        await loadAvailableProducts();
      } catch (error) {
        console.error('Failed to load admin configs:', error);
        toast.error('Failed to load configuration');
      }
    };
    
    loadConfigs();
  }, []);

  // Load available products for selection
  const loadAvailableProducts = async () => {
    setAvailableProductsLoading(true);
    try {
      const response = await fetch('/api/products/all-products');
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data.data || []);
        console.log('✅ Loaded available products for selection:', data.data?.length || 0);
      } else {
        console.error('Failed to load products:', response.status);
        toast.error('Failed to load available products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error loading available products');
    } finally {
      setAvailableProductsLoading(false);
    }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Configuration</h1>
              <p className="text-sm text-muted-foreground">
                Manage application settings and preferences
              </p>
            </div>
          </div>
          <Button onClick={() => setIsAuthenticated(false)} variant="outline">
            Logout
          </Button>
        </div>

        {/* Image Source Configuration */}
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

        {/* Feature Toggles */}
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

        {/* Printify Configuration */}
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

        {/* Custom Prompt Suggestions */}
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

        {/* API Configuration */}
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

        {/* Catalog Search */}
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

        {/* Featured Products Management */}
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
                onClick={loadAvailableProducts} 
                disabled={availableProductsLoading}
                variant="outline"
                className="w-full"
              >
                {availableProductsLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading Products...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load Available Products
                  </>
                )}
              </Button>
            </div>

            {/* Product Selection */}
            {availableProducts.length > 0 && (
              <div className="space-y-4">
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

                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {availableProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                        globalConfig.featuredProducts?.includes(product.id) 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={globalConfig.featuredProducts?.includes(product.id) || false}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                        disabled={
                          !globalConfig.featuredProducts?.includes(product.id) && 
                          (globalConfig.featuredProducts?.length || 0) >= 5
                        }
                      />
                      
                      {/* Product Image */}
                      {product.image?.src && (
                        <div className="flex-shrink-0">
                          <img 
                            src={product.image.src} 
                            alt={product.title}
                            className="w-20 h-20 object-cover rounded-lg border shadow-sm"
                          />
                        </div>
                      )}
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.title}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {product.id}
                        </p>
                        {product.price && (
                          <p className="text-sm font-medium text-green-600">
                            ${(product.price / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {availableProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No products found. Make sure you have products in your Printify shop.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
};

export default AdminConfigPage;