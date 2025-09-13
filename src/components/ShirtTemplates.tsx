import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShirtMockup } from "@/components/ShirtMockup";

interface ShirtTemplate {
  id: string;
  name: string;
  price: number;
  colors: string[];
  sizes: string[];
}

interface ShirtTemplatesProps {
  onSelectTemplate: (template: ShirtTemplate, color: string, size: string) => void;
  selectedTemplate: ShirtTemplate | null;
  selectedDesign?: {
    id: string;
    imageUrl: string;
    title: string;
    prompt: string;
  };
}

export function ShirtTemplates({ onSelectTemplate, selectedTemplate, selectedDesign }: ShirtTemplatesProps) {
  const [selectedColor, setSelectedColor] = useState<string>("White");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Fixed shirt template - Unisex Heavy Cotton Tee (Gildan)
  const template: ShirtTemplate = {
    id: "gildan-heavy-cotton",
    name: "Unisex Heavy Cotton Tee (Gildan)",
    price: 24.99,
    colors: ["White", "Black", "Navy", "Gray", "Red", "Royal Blue", "Forest Green"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
  };

  const handleConfirmSelection = () => {
    if (selectedColor && selectedSize) {
      onSelectTemplate(template, selectedColor, selectedSize);
    }
  };

  const getColorFilterStyle = (color: string) => {
    switch (color.toLowerCase()) {
      case "black":
        return "brightness(0.1) contrast(1.2)";
      case "navy":
        return "brightness(0.3) contrast(1.1) sepia(1) hue-rotate(200deg) saturate(2)";
      case "gray":
        return "brightness(0.5) contrast(1.1)";
      case "red":
        return "brightness(0.6) contrast(1.2) sepia(1) hue-rotate(340deg) saturate(2)";
      case "royal blue":
        return "brightness(0.4) contrast(1.2) sepia(1) hue-rotate(220deg) saturate(2)";
      case "forest green":
        return "brightness(0.4) contrast(1.2) sepia(1) hue-rotate(100deg) saturate(2)";
      case "white":
      default:
        return "none";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Customize Your Shirt</h2>
        <p className="text-muted-foreground">
          Choose the color and size for your design on the Gildan Heavy Cotton Tee
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Preview</h3>
          <Card className="bg-gradient-subtle">
            <CardContent className="p-6">
              <div className="aspect-square max-w-sm mx-auto">
                {selectedDesign ? (
                  <div className="relative w-full h-full">
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url('/shirt-template-white.jpg')`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        filter: getColorFilterStyle(selectedColor)
                      }}
                    />
                    <div 
                      className="absolute"
                      style={{
                        top: '25%',
                        left: '20%',
                        width: '60%',
                        height: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={selectedDesign.imageUrl}
                        alt="Design preview"
                        className="max-w-full max-h-full object-contain"
                        style={{
                          mixBlendMode: selectedColor === "White" ? "multiply" : "normal",
                          opacity: selectedColor === "White" ? 0.9 : 0.85,
                          filter: selectedColor === "Black" 
                            ? "brightness(1.4) contrast(1.3) saturate(1.2)" 
                            : "contrast(1.05) saturate(1.1)",
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Select design first</p>
                  </div>
                )}
              </div>
              {selectedColor && selectedSize && (
                <div className="mt-4 text-center space-y-2">
                  <Badge variant="secondary">{selectedColor} • Size {selectedSize}</Badge>
                  <p className="text-lg font-semibold">${template.price}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selection Section */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">{template.name}</h3>
            <Badge variant="outline">${template.price}</Badge>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <h4 className="font-medium">Color:</h4>
            <div className="grid grid-cols-4 gap-2">
              {template.colors.map((color) => (
                <Button
                  key={color}
                  variant={selectedColor === color ? "default" : "outline"}
                  size="sm"
                  className="h-12 flex flex-col items-center gap-1"
                  onClick={() => setSelectedColor(color)}
                >
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white"
                    style={{ filter: getColorFilterStyle(color) }}
                  />
                  <span className="text-xs">{color}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="space-y-3">
            <h4 className="font-medium">Size:</h4>
            <div className="grid grid-cols-4 gap-2">
              {template.sizes.map((size) => (
                <Button
                  key={size}
                  variant={selectedSize === size ? "default" : "outline"}
                  size="sm"
                  className="h-10"
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Create T-Shirt Button */}
          <div className="pt-4">
            <Button
              variant="creative"
              size="lg"
              className="w-full"
              disabled={!selectedColor || !selectedSize}
              onClick={handleConfirmSelection}
            >
              Create T-Shirt • ${template.price}
            </Button>
            {(!selectedColor || !selectedSize) && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please select both color and size
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
