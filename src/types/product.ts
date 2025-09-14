// Shared interfaces for product-related components

export interface ProductImage {
  src: string;
  variant_ids: number[];
  position: string;
  is_default: boolean;
  is_selected_for_publishing?: boolean;
  order?: number | null;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  image: ProductImage | null;
  price: number | null;
  created_at?: string;
  visible?: boolean;
  variants?: Array<{
    id: number;
    title: string;
    price: number;
    is_default: boolean;
  }>;
}

export interface Variant {
  id: number;
  title: string;
  options: {
    color?: string;
    size?: string;
  };
  cost: number;
  price: number;
  is_enabled: boolean;
  is_default: boolean;
  is_available: boolean;
}

export interface TopProductsResponse {
  data: Product[];
  total: number;
  shop_id: string;
  shop_name: string;
}

export interface Shop {
  id: number;
  title: string;
  sales_channel: string;
}