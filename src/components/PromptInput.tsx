import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Wand2, RefreshCw } from "lucide-react";
import { getCurrentImageSource } from "@/lib/adminConfig";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

// Function to get seasonal and holiday context
function getSeasonalContext(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // getMonth() returns 0-11
  const day = now.getDate();
  
  // Halloween (October)
  if (month === 10) {
    return "Since it's October (Halloween season), include spooky, autumn, and Halloween-themed designs like pumpkins, ghosts, bats, witches, fall leaves, and scary elements.";
  }
  
  // Thanksgiving/Late Fall (November)
  if (month === 11) {
    return "Since it's November (Thanksgiving season), include autumn, gratitude, harvest, and fall-themed designs like turkeys, fall leaves, pumpkins, cozy themes, and thanksgiving elements.";
  }
  
  // Christmas/Winter Holiday Season (December)
  if (month === 12) {
    return "Since it's December (Christmas/Holiday season), include winter, Christmas, holiday, and festive designs like snowflakes, Christmas trees, Santa, reindeer, winter scenes, and holiday themes.";
  }
  
  // New Year/Winter (January)
  if (month === 1) {
    return "Since it's January (New Year/Winter season), include winter, new beginnings, resolution, and cold weather themes like snowflakes, winter sports, fresh starts, and cozy winter elements.";
  }
  
  // Valentine's Day (February)
  if (month === 2) {
    return "Since it's February (Valentine's season), include love, romance, hearts, and winter themes like cupid, roses, pink/red colors, love quotes, and romantic elements.";
  }
  
  // Spring (March-May)
  if (month >= 3 && month <= 5) {
    let springContext = "Since it's spring, include fresh, blooming, and renewal themes like flowers, green growth, rain, sunshine, and nature awakening.";
    
    // St. Patrick's Day (March 17)
    if (month === 3 && day <= 20) {
      springContext += " Also include St. Patrick's Day themes like shamrocks, green colors, and Irish elements.";
    }
    
    // Easter (varies, but often in March/April)
    if (month === 3 || month === 4) {
      springContext += " Also consider Easter themes like bunnies, eggs, pastel colors, and spring renewal.";
    }
    
    return springContext;
  }
  
  // Summer (June-August)
  if (month >= 6 && month <= 8) {
    let summerContext = "Since it's summer, include hot weather, vacation, beach, and outdoor themes like sun, waves, surfing, camping, and tropical elements.";
    
    // Independence Day (July 4th)
    if (month === 7) {
      summerContext += " Also include patriotic and 4th of July themes like flags, fireworks, red/white/blue, and American elements.";
    }
    
    return summerContext;
  }
  
  // Fall (September-November)
  if (month === 9) {
    return "Since it's September (early fall), include back-to-school, autumn beginning, and harvest themes like leaves changing, cozy sweaters, apples, and fall activities.";
  }
  
  // Default fallback
  return "Include seasonal and timely design elements that feel current and relevant.";
}

export function PromptInput({ onGenerate, isGenerating }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  
  // Generate seasonal default prompts
  const getSeasonalDefaultPrompts = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    // Halloween (October)
    if (month === 10) {
      return [
        "Spooky haunted forest scene",
        "Vintage Halloween pumpkin design", 
        "Ghostly silhouette pattern",
        "Autumn leaves with bats",
        "Witch hat and moon",
        "Jack-o'-lantern illustration",
        "Gothic skull artwork",
        "Fall harvest pumpkin patch"
      ];
    }
    
    // Christmas/Winter (November-January)
    if (month === 11 || month === 12 || month === 1) {
      return [
        "Winter wonderland snowflakes",
        "Cozy cabin mountain scene",
        "Vintage Christmas ornaments",
        "Snowy pine tree forest",
        "Holiday wreath design",
        "Festive reindeer silhouette",
        "Christmas star constellation",
        "Winter mittens pattern"
      ];
    }
    
    // Valentine's (February)
    if (month === 2) {
      return [
        "Watercolor heart design",
        "Vintage love letter art",
        "Rose bouquet illustration",
        "Cupid arrow pattern",
        "Pink cherry blossoms",
        "Romantic quote typography",
        "Hand-drawn love birds",
        "Abstract heart geometry"
      ];
    }
    
    // Spring (March-May)
    if (month >= 3 && month <= 5) {
      return [
        "Blooming cherry blossoms",
        "Spring wildflower meadow",
        "Fresh green leaf pattern",
        "Easter bunny silhouette",
        "Rain cloud illustration",
        "Butterfly garden scene",
        "Spring bird nest",
        "Pastel flower bouquet"
      ];
    }
    
    // Summer (June-August)
    if (month >= 6 && month <= 8) {
      return [
        "Tropical sunset waves",
        "Beach palm tree paradise",
        "Vintage surfboard design",
        "Summer camp adventure",
        "Fireworks night sky",
        "Ice cream cone pattern",
        "Ocean wave typography",
        "Camping under stars"
      ];
    }
    
    // Fall (September)
    if (month === 9) {
      return [
        "Autumn maple leaf design",
        "Back to school vintage",
        "Harvest pumpkin patch",
        "Cozy sweater weather",
        "Apple orchard scene",
        "Fall hiking mountains",
        "Acorn and oak leaves",
        "Rustic barn illustration"
      ];
    }
    
    // Default fallback
    return [
      "Cosmic galaxy with nebula colors",
      "Vintage retro sunset waves", 
      "Abstract geometric patterns",
      "Nature forest silhouette",
      "Minimalist mountain landscape",
      "Urban street art graffiti",
      "Mystical dragon silhouette",
      "Watercolor butterfly garden"
    ];
  };
  
  const [quickPrompts, setQuickPrompts] = useState(getSeasonalDefaultPrompts());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim());
    }
  };

  const generateNewPrompts = async () => {
    setIsRefreshing(true);
    try {
      // Get seasonal/holiday context
      const seasonalContext = getSeasonalContext();
      
      // Add randomization and uniqueness to ensure fresh prompts every time
      const timestamp = Date.now();
      const randomSeed = Math.floor(Math.random() * 10000);
      const themes = ['nature', 'abstract', 'retro', 'cosmic', 'minimalist', 'urban', 'tropical', 'mystical', 'geometric', 'watercolor', 'neon', 'vintage'];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      
      const promptText = `Generate 8 completely unique and creative t-shirt design prompts. ${seasonalContext} Focus on ${randomTheme} themes. Each prompt should be 3-6 words describing visual designs perfect for t-shirts. Make them fresh, original, and different from typical suggestions. Include variety like: artistic styles, animals, patterns, nature elements, abstract concepts. Timestamp: ${timestamp}. Seed: ${randomSeed}. Return only the 8 prompts, one per line, no numbering or extra text.`;
      
      const response = await fetch(`https://text.pollinations.ai/${promptText}`);
      const result = await response.text();
      
      // Parse the response and extract prompts
      const newPrompts = result
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+\.?\s*/) && line.length > 5) // Remove empty lines, numbers, and very short lines
        .slice(0, 8); // Take first 8
      
      if (newPrompts.length >= 6) {
        setQuickPrompts(newPrompts);
      } else {
        // Enhanced fallback with more variety and randomization
        const fallbackSets = [
          [
            "Watercolor butterfly garden",
            "Neon cyberpunk cityscape", 
            "Hand-drawn coffee illustration",
            "Geometric mandala design",
            "Vintage compass adventure",
            "Abstract paint splashes",
            "Minimalist wave pattern",
            "Bohemian sun and moon"
          ],
          [
            "Electric lightning storm",
            "Pastel gradient mountains",
            "Sketched forest animals",
            "Art deco patterns",
            "Glowing jellyfish underwater",
            "Tribal arrow designs",
            "Sunset palm silhouettes",
            "Crystal geometric shapes"
          ],
          [
            "Ink splash octopus",
            "Retro arcade pixels",
            "Watercolor world map",
            "Zen circle brushstrokes",
            "Vintage camera illustration",
            "Aurora borealis waves",
            "Hand lettered quotes",
            "Constellation star map"
          ],
          [
            "Desert cactus landscape",
            "Grunge texture overlay",
            "Origami paper crane",
            "Rainbow prism effect",
            "Vintage motorcycle art",
            "Ocean wave typography",
            "Forest moonlight scene",
            "Abstract color blocks"
          ]
        ];
        
        // Add seasonal fallback set if it's a special time of year
        const seasonalSet = getSeasonalDefaultPrompts();
        const allSets = [...fallbackSets, seasonalSet];
        
        // Use timestamp to select different fallback set each time
        const setIndex = Math.floor(Date.now() / 10000) % allSets.length;
        setQuickPrompts(allSets[setIndex]);
      }
    } catch (error) {
      console.error('Failed to generate new prompts:', error);
      // Even more randomized fallback
      const randomFallbacks = [
        "Dreamy cloud formations", "Vintage vinyl records", "Cosmic space nebula",
        "Minimalist line art", "Tropical fruit patterns", "Urban graffiti style",
        "Watercolor animal portraits", "Geometric sacred symbols", "Retro neon signs",
        "Abstract fluid shapes", "Mountain peak silhouette", "Ocean wave motion",
        "Forest tree rings", "Crystal cave formations", "Desert sand dunes",
        "Lightning storm energy", "Sunset color gradients", "Starry night sky"
      ];
      
      // Shuffle and pick 8 random ones
      const shuffled = randomFallbacks.sort(() => Math.random() - 0.5);
      setQuickPrompts(shuffled.slice(0, 8));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-card">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Describe Your Design</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {(() => {
                const currentImageMode = getCurrentImageSource();
                return currentImageMode === "huggingface" 
                  ? "Tell us what you'd like to see on your shirt and we'll generate 3 unique AI designs for you to choose from"
                  : currentImageMode === "pollinations"
                  ? "Describe your vision and we'll create 3 stunning AI-generated designs using advanced machine learning"
                  : "Describe your design and we'll find 3 beautiful stock images to match your vision";
              })()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A majestic mountain landscape with aurora borealis..."
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
            </div>

            <Button
              type="submit"
              variant="creative"
              size="lg"
              className="w-full"
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  {(() => {
                    const currentImageMode = getCurrentImageSource();
                    return currentImageMode === "huggingface" 
                      ? "Creating Magic..." 
                      : currentImageMode === "pollinations"
                      ? "Generating Art..."
                      : "Finding Perfect Images...";
                  })()}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {(() => {
                    const currentImageMode = getCurrentImageSource();
                    return currentImageMode === "huggingface" 
                      ? "Generate 3 AI Designs" 
                      : currentImageMode === "pollinations"
                      ? "Create 3 AI Designs"
                      : "Find 3 Stock Designs";
                  })()}
                </>
              )}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <p className="text-xs text-muted-foreground">Quick ideas to get started:</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={generateNewPrompts}
                disabled={isRefreshing || isGenerating}
                title="Generate new creative prompts"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((quickPrompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2 px-3"
                  onClick={() => setPrompt(quickPrompt)}
                  disabled={isGenerating}
                >
                  {quickPrompt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}