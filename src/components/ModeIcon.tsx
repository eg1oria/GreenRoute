import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { IconName } from '@/lib/modes';
import type { Mode } from '@/types';

const ION_ICON: Record<Exclude<Mode, 'scooter'>, IconName> = {
  walk: 'walk',
  bike: 'bicycle',
  metro: 'subway',
  transit: 'bus',
  car: 'car',
};

export function ModeIcon({ mode, size, color }: { mode: Mode; size: number; color: string }) {
  // В Ionicons нет самоката
  if (mode === 'scooter') return <MaterialCommunityIcons name="scooter-electric" size={size} color={color} />;
  return <Ionicons name={ION_ICON[mode]} size={size} color={color} />;
}
