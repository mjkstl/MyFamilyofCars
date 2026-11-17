import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { CarStatus } from '@/types/database';

/**
 * How each car status looks — label, icon and badge colours — in ONE
 * place. CarCard and CollectionCarRow each used to carry their own copy
 * of this table, which is how two screens drift apart over time.
 */
export const CAR_STATUS_META: Record<
  CarStatus,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string; fg: string }
> = {
  first: { label: 'First Car', icon: 'numeric-1-circle', bg: '#DBEAFE', fg: '#1D4ED8' },
  current: { label: 'Currently Driving', icon: 'circle', bg: '#DCFCE7', fg: '#166534' },
  memory: { label: 'Memory', icon: 'image-multiple', bg: '#E0E7FF', fg: '#3730A3' },
  dream: { label: 'Dream Car', icon: 'star', bg: '#FEF3C7', fg: '#92400E' },
};
