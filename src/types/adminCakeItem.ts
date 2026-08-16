// Shared controlled-value shape for the admin cake-customization form
// (Order Detail's per-line-item editor, and New Order's "+ Add customization
// details" panel) — mirrors CakeCustomizer's internal state one-for-one so
// the same field components (SelectChip/ColorSwatch/InputField/
// QuantityStepper/TopperCard) can render either normal-cake or Fake Cake
// fields off one value object instead of duplicating that branching logic.
export type CakeItemFieldsValue = {
  isFake: boolean;
  sizeId: string | null;
  tierId: string | null;
  flavorId: string | null;
  fiftyFifty: boolean;
  secondFlavorId: string | null;
  shapeId: string | null;
  fakeSizeCm: string;
  fakeShapeId: string | null;
  referenceImageUrl: string | null;
  referenceImagePublicId: string | null;
  colorIds: string[];
  colorArrangementNotes: string;
  topperId: string | null;
  topperColorId: string | null;
  textOnCake: string;
  textOnBoard: string;
  notes: string;
};
