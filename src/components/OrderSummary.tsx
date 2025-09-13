import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, CreditCard, Truck } from "lucide-react";

interface Design {
  id: string;
  imageUrl: string;
  title: string;
  prompt: string;
}

interface ShirtTemplate {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  colors: string[];
  sizes: string[];
}

interface OrderSummaryProps {
  design: Design;
  template: ShirtTemplate;
  color: string;
  size: string;
  onPlaceOrder: () => void;
}

export function OrderSummary({ design, template, color, size, onPlaceOrder }: OrderSummaryProps) {
  const subtotal = template.price;
  const shipping = 4.99;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Design Preview */}
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-gradient-subtle rounded-lg overflow-hidden">
              <img
                src={design.imageUrl}
                alt={design.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold">{design.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {design.prompt}
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">Custom Design</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shirt Details */}
          <div className="space-y-3">
            <h4 className="font-semibold">Shirt Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Style:</span>
                <p className="font-medium">{template.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Color:</span>
                <p className="font-medium">{color}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <p className="font-medium">{size}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Quantity:</span>
                <p className="font-medium">1</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-3">
            <h4 className="font-semibold">Pricing</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Delivery Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Estimated Delivery: 5-7 business days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your custom design will be printed and shipped via Printify
            </p>
          </div>

          {/* Place Order Button */}
          <Button 
            variant="creative" 
            size="lg" 
            className="w-full animate-pulse-glow"
            onClick={onPlaceOrder}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Place Order - ${total.toFixed(2)}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure checkout powered by Printify. 30-day money-back guarantee.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}