import { useState, useRef, useEffect } from "react";
import { getShapeStyles, type ImageShape, type AspectRatio } from "@/lib/utils";
import { calculatePrintifyPositioning } from "@/lib/printifyPositioning";
// Import white shirt template
import shirtWhite from "@/assets/shirt-template-white.jpg";

interface ShirtMockupProps {
  designUrl: string;
  className?: string;
  onImageError?: () => void;
  shape?: ImageShape;
  aspectRatio?: AspectRatio;
}

export function ShirtMockup({ 
  designUrl, 
  className = "", 
  onImageError,
  shape = 'square',
  aspectRatio = '1:1'
}: ShirtMockupProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [designImageError, setDesignImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Update container dimensions when component mounts or resizes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setContainerDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [imageLoaded]);

  // Calculate design position on the white shirt
  const getDesignPosition = () => {
    if (!containerDimensions.width || !containerDimensions.height) return null;
    
    // Use the same positioning logic as Printify for consistency
    const printifyCoords = calculatePrintifyPositioning(shape, aspectRatio);
    
    // Convert Printify coordinates to pixel positioning for preview
    const designCoords = {
      x: printifyCoords.x,        // Use calculated x position
      y: printifyCoords.y,        // Use calculated y position  
      scale: printifyCoords.scale * 0.75,  // Scale down for preview (Printify uses larger scale)
    };
    
    // Define the print area boundaries on the shirt
    const shirtPrintArea = {
      top: containerDimensions.height * 0.25,     // Print area starts 25% from top
      left: containerDimensions.width * 0.2,      // Print area starts 20% from left  
      width: containerDimensions.width * 0.6,     // Print area is 60% of container width
      height: containerDimensions.height * 0.5,   // Print area is 50% of container height
    };
    
    // Calculate design dimensions and position
    const designWidth = shirtPrintArea.width * designCoords.scale;
    const designHeight = shirtPrintArea.height * designCoords.scale;
    
    const designX = shirtPrintArea.left + (shirtPrintArea.width * designCoords.x) - (designWidth / 2);
    const designY = shirtPrintArea.top + (shirtPrintArea.height * designCoords.y) - (designHeight / 2);
    
    return {
      top: designY,
      left: designX,
      width: designWidth,
      height: designHeight,
    };
  };

  const designPosition = getDesignPosition();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* White Shirt Template */}
      <div className="relative w-full h-full">
        <img
          src={shirtWhite}
          alt="White t-shirt template"
          className="w-full h-full object-contain"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            console.error('Failed to load white shirt template');
            onImageError?.();
          }}
        />
        
        {/* Design Overlay */}
        {imageLoaded && !designImageError && designPosition && (
          <div 
            className="absolute"
            style={{
              top: `${designPosition.top}px`,
              left: `${designPosition.left}px`,
              width: `${designPosition.width}px`,
              height: `${designPosition.height}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={designUrl}
              alt="Custom design"
              className="max-w-full max-h-full object-contain"
              onError={() => {
                setDesignImageError(true);
                onImageError?.();
              }}
              style={{
                mixBlendMode: "multiply",
                opacity: 0.9,
                filter: "contrast(1.05) saturate(1.1)",
              }}
            />
          </div>
        )}

        {/* Fallback positioning */}
        {imageLoaded && !designImageError && !designPosition && (
          <div className="absolute inset-0">
            <div 
              className="absolute"
              style={{
                top: `${calculatePrintifyPositioning(shape, aspectRatio).y * 100}%`,
                left: '20%',
                width: '60%',
                height: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={designUrl}
                alt="Custom design"
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  setDesignImageError(true);
                  onImageError?.();
                }}
                style={{
                  mixBlendMode: "multiply",
                  opacity: 0.9,
                  filter: "contrast(1.05) saturate(1.1)",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}