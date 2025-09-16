import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart, ShoppingCart, AlertCircle, Download, X } from "lucide-react";
import { ShirtMockup } from "@/components/ShirtMockup";
import { getShapeStyles, type ImageShape, type AspectRatio } from "@/lib/utils";

interface Design {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
  originalPrompt?: string; // Store original user prompt for cleaner display
  shape: ImageShape;
  aspectRatio: AspectRatio;
}

interface DesignDisplayProps {
  designs: Design[];
  onSelectDesign: (design: Design) => void;
  selectedDesign: Design | null; // Keep for compatibility but will use selectedDesigns prop when available
  selectedDesigns?: Design[]; // New prop for multiple selections
  designConfigs?: {[designId: string]: {color: string, size: string, variant: any}}; // Configuration for each design
  onDownloadImage?: (imageUrl: string, title: string) => void;
}

export function DesignDisplay({ designs, onSelectDesign, selectedDesign, selectedDesigns = [], designConfigs = {}, onDownloadImage }: DesignDisplayProps) {
  const [likedDesigns, setLikedDesigns] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<Design | null>(null);

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
          const isSelected = selectedDesigns.some(d => d.id === design.id) || selectedDesign?.id === design.id;
          const canSelect = selectedDesigns.length < 3 || isSelected;
          const config = designConfigs[design.id];
          
          return (
            <Card 
              key={design.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-creative ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-creative' 
                  : canSelect ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
              }`}
              onClick={() => canSelect && onSelectDesign(design)}
            >
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <div 
                    className="aspect-square rounded-lg overflow-hidden bg-gradient-subtle cursor-pointer group-hover:shadow-lg transition-shadow"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!imageErrors.has(design.id)) {
                        setPreviewImage(design);
                      }
                    }}
                  >
                    {imageErrors.has(design.id) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mb-2" />
                        <p className="text-sm">Failed to load image</p>
                      </div>
                    ) : (
                      <>
                        <ShirtMockup
                          designUrl={design.imageUrl}
                          className="w-full h-full transition-transform group-hover:scale-105"
                          onImageError={() => handleImageError(design.id)}
                          shape={design.shape}
                          aspectRatio={design.aspectRatio}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                            Click to preview
                          </div>
                        </div>
                      </>
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
                      {design.originalPrompt || design.prompt.split(',')[0].trim()}
                    </p>
                  </div>

                  <Button
                    variant={isSelected ? "creative" : canSelect ? "outline" : "secondary"}
                    size="sm"
                    className="w-full"
                    disabled={!canSelect}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canSelect) onSelectDesign(design);
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {isSelected && config ? 
                      `${config.color} • ${config.size}` : 
                      isSelected ? 'Selected' : 
                      selectedDesigns.length >= 3 ? 'Limit Reached' : 
                      'Select This Design'
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(selectedDesigns.length > 0 || selectedDesign) && (
        <div className="text-center space-y-2">
          {selectedDesigns.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedDesigns.length} of 3 designs selected
            </p>
          )}
          <Button variant="creative" size="lg" className="animate-pulse-glow">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Continue to Shirt Configuration
          </Button>
        </div>
      )}

      {/* AI Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Design Preview</DialogTitle>
            <DialogDescription>Full size preview of the selected design</DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="p-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold mb-2">{previewImage.title}</h3>
                  <p className="text-sm text-muted-foreground">{previewImage.originalPrompt || previewImage.prompt.split(',')[0].trim()}</p>
                </div>
                <div className="flex justify-center">
                  <img
                    src={previewImage.imageUrl}
                    alt={previewImage.title}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                </div>
                <div className="flex gap-3 justify-center mt-6">
                  {onDownloadImage && (
                    <Button
                      variant="outline"
                      onClick={() => onDownloadImage(previewImage.imageUrl, previewImage.title)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  )}
                  <Button
                    variant="creative"
                    onClick={() => {
                      onSelectDesign(previewImage);
                      setPreviewImage(null);
                    }}
                    className="gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Select This Design
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}