import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { Mode } from '@/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const MODES: Mode[] = ['walk', 'bike', 'transit', 'car'];

export const MODE_META: Record<Mode, { label: string; how: string; icon: IconName }> = {
  walk: { label: 'Пешком', how: 'Пешком', icon: 'walk' },
  bike: { label: 'Велосипед', how: 'На велосипеде', icon: 'bicycle' },
  transit: { label: 'Транспорт', how: 'На транспорте', icon: 'bus' },
  car: { label: 'Авто', how: 'На авто', icon: 'car' },
};
