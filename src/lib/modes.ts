import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { Mode } from '@/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Штрих линии на карте — для способов, чей путь не построен роутингом. Названия способов — в src/i18n. */
export const MODE_DASH: Partial<Record<Mode, [number, number]>> = {
  metro: [2, 9],
  transit: [12, 8],
};
