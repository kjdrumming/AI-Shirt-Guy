import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, RefreshCw, Lock, Unlock } from "lucide-react";
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

const AdminConfigPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [globalConfig, setGlobalConfig] = useState<AdminConfig>({
    imageSource: "stock",
    debugMode: false,
    maxDesignsPerGeneration: 3,
    enableMultiShirtSelection: true,
    customPromptSuggestions: [],
    maintenanceMode: false
  });
  const [localSettings, setLocalSettings] = useState<LocalAdminSettings>({
    adminPassword: "admin123",
    printifyApiToken: ""
  });
  const [newPromptSuggestion, setNewPromptSuggestion] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      } catch (error) {
        console.error('Failed to load admin configs:', error);
        toast.error('Failed to load configuration');
      }
    };
    
    loadConfigs();
  }, []);

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
      imageSource: "stock",
      debugMode: false,
      maxDesignsPerGeneration: 3,
      enableMultiShirtSelection: true,
      customPromptSuggestions: [],
      maintenanceMode: false
    });
    setLocalSettings({
      adminPassword: "admin123",
      printifyApiToken: ""
    });
    toast.success("Configuration reset to defaults");
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