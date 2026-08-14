export type Bilingual = {
  en: string;
  ar: string;
};

export type Category = {
  id: string;
  parent_id: string | null;
  name: Bilingual;
  slug: string;
  sort_order: number;
};

export type Cake = {
  id: string;
  category_id: string;
  name: Bilingual;
  description: Bilingual | null;
  base_price: number;
  primary_image_url: string | null;
  featured: boolean;
  sort_order: number;
};

export type Size = {
  id: string;
  category_id: string;
  min_qty: number;
  max_qty: number;
  unit: "servings" | "quantity" | "cm";
  price_modifier: number;
  sort_order: number;
};

export type Tier = {
  id: string;
  tier_count: number;
  price_modifier: number;
};

export type Flavor = {
  id: string;
  name: Bilingual;
  price_modifier: number;
};

export type Color = {
  id: string;
  name: Bilingual;
  hex_code: string | null;
};

export type Shape = {
  id: string;
  name: Bilingual;
  fake_eligible: boolean;
};

export type Topper = {
  id: string;
  name: Bilingual;
  price_modifier: number;
  has_color_variants: boolean;
};

export type DeliveryArea = {
  id: string;
  name: Bilingual;
  price: number;
};
