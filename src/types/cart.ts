import type { Bilingual } from "./catalog";

/** Shaped to map 1:1 onto `order_items` (+ `order_item_flavors` / `order_item_colors`) for Phase 4 checkout submission. */
export type CartItem = {
  id: string;
  cakeId: string;
  cakeName: Bilingual;
  cakeImage: string | null;
  categorySlug: string;

  isFake: boolean;

  // Real cake fields (required when isFake is false)
  sizeId: string | null;
  sizeLabel: string | null;
  tierId: string | null;
  tierCount: number | null;
  isFiftyFifty: boolean;
  flavorIds: string[];
  flavorNames: string[];

  // Fake cake fields (required when isFake is true)
  fakeSizeCm: number | null;
  fakeShapeId: string | null;
  fakeShapeName: string | null;
  referenceImageUrl: string | null;
  referenceImagePublicId: string | null;

  // Shared fields
  shapeId: string | null;
  shapeName: string | null;
  colorIds: string[];
  colorNames: string[];
  /** Only set (non-null) when more than one color was picked. */
  colorArrangementNotes: string | null;
  topperId: string | null;
  topperName: string | null;
  topperColorId: string | null;
  textOnCake: string;
  textOnBoard: string;
  notes: string;
  quantity: number;

  unitBasePrice: number;
  priceModifiersTotal: number;
  lineEstimate: number;
};
