import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Wand2 } from "lucide-react";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  imageMode?: "ai" | "stock";
}

export function PromptInput({ onGenerate, isGenerating, imageMode = "ai" }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim());
    }
  };

  const quickPrompts = [
    "Cosmic galaxy with nebula colors",
    "Vintage retro sunset waves", 
    "Abstract geometric patterns",
    "Nature forest silhouette",
  ];

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
              {imageMode === "ai" 
                ? "Tell us what you'd like to see on your shirt and we'll generate 3 unique AI designs for you to choose from"
                : "Describe your design and we'll find 3 beautiful stock images to match your vision"
              }
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
                  {imageMode === "ai" ? "Creating Magic..." : "Finding Perfect Images..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {imageMode === "ai" ? "Generate 3 AI Designs" : "Find 3 Stock Designs"}
                </>
              )}
            </Button>
          </form>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">Quick ideas to get started:</p>
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