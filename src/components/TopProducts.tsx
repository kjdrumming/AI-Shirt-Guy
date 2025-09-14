import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, Palette, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SizeColorModal from "./SizeColorModal";
import { Product, Variant, TopProductsResponse } from "@/types/product";
import { cleanProductDescription } from "@/lib/productMetadata";

export function TopProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the direct endpoint for AI-Shirt-Guy shop products
        console.log('🛍️ Fetching top products from AI-Shirt-Guy shop...');
        const response = await fetch('/api/products/top-products');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to fetch products:', errorText);
          throw new Error(`Failed to fetch products: ${response.status}`);
        }

        const data: TopProductsResponse = await response.json();
        console.log('✅ Got products from AI-Shirt-Guy shop:', data);
        setProducts(data.data || []);
        setShopId(data.shop_id?.toString() || '24294177');

      } catch (error) {
        console.error('❌ Error fetching top products:', error);
        setError(error instanceof Error ? error.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, []);

  const formatPrice = (price: number | null) => {
    if (!price) return 'Price not set';
    return `$${(price / 100).toFixed(2)}`;
  };

  const handleSelectSizeColor = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleProceedToCheckout = (checkoutInfo: {
    originalProductId: string;
    newProductId: string;
    selectedVariant: Variant;
    originalProduct: Product;
    newProduct: any;
  }) => {
    // Close modal and navigate to Index.tsx with the created product data
    setModalOpen(false);
    
    // Navigate to Index.tsx with featured product data that will start the workflow at "creating" step
    navigate('/', { 
      state: { 
        featuredProductWorkflow: {
          step: 'payment', // Jump to payment step since product is already created
          createdProduct: checkoutInfo.newProduct,
          selectedVariant: checkoutInfo.selectedVariant,
          originalProduct: checkoutInfo.originalProduct,
          productId: checkoutInfo.newProductId
        }
      } 
    });
    
    toast.success("Product created! Proceeding to payment...");
  };

  if (loading) {
    return (
      <Card className="w-full max-w-6xl mx-auto shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Our Top Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading top products...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-6xl mx-auto shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Our Top Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Unable to load products at the moment</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="w-full max-w-6xl mx-auto shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Our Top Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No published products found yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start creating designs to see them featured here!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Our Top Products
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Check out our most popular designs currently available
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow duration-200">
              <div className="relative overflow-hidden rounded-t-lg">
                {product.image?.src ? (
                  <img
                    src={product.image.src}
                    alt={product.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {product.visible && (
                  <Badge className="absolute top-2 right-2 bg-green-600 hover:bg-green-700">
                    Published
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                  {product.title}
                </h3>
                
                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {cleanProductDescription(product.description)}
                  </p>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  {product.variants.length > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {product.variants.length} variants
                    </Badge>
                  )}
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  onClick={() => handleSelectSizeColor(product)}
                >
                  <Palette className="h-3 w-3" />
                  Select Size & Color
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {products.length === 5 && (
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Showing top 5 products • 
              <Button variant="link" className="p-0 ml-1 text-sm" asChild>
                <a href="#" onClick={() => toast.info('Full catalog coming soon!')}>
                  View all products
                </a>
              </Button>
            </p>
          </div>
        )}
      </CardContent>

      {/* Size/Color Selection Modal */}
      <SizeColorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={selectedProduct}
        onProceedToCheckout={handleProceedToCheckout}
      />
    </Card>
  );
}