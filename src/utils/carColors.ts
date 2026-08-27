/**
 * Shared car color palette. Cars store `color` as the NAME (e.g. "Ruby Red"),
 * not a hex value — this file is the single source of truth mapping a name
 * to its swatch hex, used by both the AddCarScreen picker and CarCard.
 */
export interface CarColorOption {
  name: string;
  hex: string;
}

export const CAR_COLORS: CarColorOption[] = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Pearl White', hex: '#F3F1EA' },
  { name: 'Silver', hex: '#C7C9CC' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Black', hex: '#0A0A0A' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Maroon', hex: '#7F1D1D' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Gold', hex: '#D4AF37' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Beige', hex: '#D8CAB8' },
  { name: 'Tan', hex: '#C4A484' },
  { name: 'Brown', hex: '#78350F' },
  { name: 'Bronze', hex: '#8C7853' },
  { name: 'Dark Green', hex: '#14532D' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Light Blue', hex: '#60A5FA' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Purple', hex: '#7C3AED' },
];

/** Looks up the swatch hex for a stored color name. Falls back to a neutral
 * gray for anything unrecognized so CarCard never crashes on an odd value. */
export function getColorHex(colorName: string | null | undefined): string {
  if (!colorName) return '#D1D5DB';
  const match = CAR_COLORS.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
  return match?.hex ?? (colorName.startsWith('#') ? colorName : '#D1D5DB');
}
