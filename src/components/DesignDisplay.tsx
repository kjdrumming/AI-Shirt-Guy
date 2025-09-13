import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, AlertCircle, Download } from "lucide-react";
import { ShirtMockup } from "@/components/ShirtMockup";

interface Design {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
}

interface DesignDisplayProps {
  designs: Design[];
  onSelectDesign: (design: Design) => void;
  selectedDesign: Design | null;
  onDownloadImage?: (imageUrl: string, title: string) => void;
}

export function DesignDisplay({ designs, onSelectDesign, selectedDesign, onDownloadImage }: DesignDisplayProps) {
  const [likedDesigns, setLikedDesigns] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const toggleLike = (designId: string) => {
    setLikedDesigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(designId)) {
        newSet.delete(designId);
      } else {
        newSet.add(designId);
      }
      return newSet;
    });
  };

  const handleImageError = (designId: string) => {
    setImageErrors(prev => new Set([...prev, designId]));
  };

  if (designs.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Your AI-Generated Designs</h2>
        <p className="text-muted-foreground">
          Select your favorite design to customize and order
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {designs.map((design, index) => {
          return (
            <Card 
              key={design.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-creative ${
                selectedDesign?.id === design.id 
                  ? 'ring-2 ring-primary shadow-creative' 
                  : 'hover:scale-105'
              }`}
              onClick={() => onSelectDesign(design)}
            >
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gradient-subtle">
                    {imageErrors.has(design.id) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mb-2" />
                        <p className="text-sm">Failed to load image</p>
                      </div>
                    ) : (
                      <ShirtMockup
                        designUrl={design.imageUrl}
                        className="w-full h-full"
                        onImageError={() => handleImageError(design.id)}
                      />
                    )}
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-2">
                    {onDownloadImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadImage(design.imageUrl, design.title);
                        }}
                        title="Download image"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(design.id);
                      }}
                      title="Like design"
                    >
                      <Heart 
                        className={`h-4 w-4 ${
                          likedDesigns.has(design.id) 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-gray-600'
                        }`} 
                      />
                    </Button>
                  </div>

                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      Design {index + 1}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold truncate">{design.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {design.prompt}
                    </p>
                  </div>

                  <Button
                    variant={selectedDesign?.id === design.id ? "creative" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDesign(design);
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {selectedDesign?.id === design.id ? 'Selected' : 'Select This Design'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedDesign && (
        <div className="text-center">
          <Button variant="creative" size="lg" className="animate-pulse-glow">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Continue to Shirt Selection
          </Button>
        </div>
      )}
    </div>
  );
}