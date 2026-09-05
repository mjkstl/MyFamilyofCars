export type ProductStatus = 'hidden' | 'active' | 'coming-soon';

export interface KeepsakeProduct {
  id: string;
  displayName: string;
  description: string;
  layout: 'storybook';
  minItems: number;
  maxItems: number | null;
  pageCount: { min: number; max: number | null };
  coverRequirements: readonly string[];
  supplierSku: string | null;
  status: ProductStatus;
}

export const HARDCOVER_FAMILY_BOOK: KeepsakeProduct = {
  id: 'hardcover-family-of-cars-book',
  displayName: 'Hardcover Family of Cars Book',
  description: 'A printed book of your family’s cars and the stories that go with them.',
  layout: 'storybook',
  minItems: 1,
  maxItems: null,
  pageCount: { min: 12, max: null },
  coverRequirements: ['family name', 'collection title'],
  supplierSku: null,
  status: 'coming-soon',
};

export const KEEPSAKE_PRODUCTS: readonly KeepsakeProduct[] = [HARDCOVER_FAMILY_BOOK];
