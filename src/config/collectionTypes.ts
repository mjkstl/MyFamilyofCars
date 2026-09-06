import type { CarStatus } from '@/types/database';

export type CollectionType = 'cars';

export interface CollectionTypeConfig {
  type: CollectionType;
  label: string;
  itemLabel: string;
  fields: readonly string[];
  filters: readonly { value: CarStatus | 'all'; label: string }[];
  validate: (input: { make?: string; model?: string; year?: number }) => string[];
}

export const CARS_COLLECTION_CONFIG: CollectionTypeConfig = {
  type: 'cars',
  label: 'Cars',
  itemLabel: 'car',
  fields: ['year', 'make', 'model', 'color', 'era', 'status', 'nickname', 'story'],
  filters: [
    { value: 'all', label: 'All' },
    { value: 'current', label: 'Currently Driving' },
    { value: 'first', label: 'First Car' },
    { value: 'memory', label: 'Memories' },
    { value: 'dream', label: 'Dream Cars' },
  ],
  validate: (input) => {
    const errors: string[] = [];
    if (!input.make?.trim()) errors.push('Make is required.');
    if (!input.model?.trim()) errors.push('Model is required.');
    if (!input.year || input.year < 1886 || input.year > 2100) errors.push('Enter a valid year.');
    return errors;
  },
};

// Future collection types belong here. Do not add them to the UI until their
// permissions, migrations, and screens are ready.
export const COLLECTION_TYPE_CONFIGS: Readonly<Record<CollectionType, CollectionTypeConfig>> = {
  cars: CARS_COLLECTION_CONFIG,
};
