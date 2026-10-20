type FormatConfig = {
  /** разделитель дробной части */
  decimal: ',' | '.';
  units: { min: string; h: string; m: string; km: string; g: string; kg: string };
  /** сокращённые названия месяцев, с января */
  months: string[];
  /** true — «Oct 5», false — «5 окт» */
  monthFirst: boolean;
};

/** Форматирование чисел, единиц и дат для одного языка интерфейса. */
export function createFormat({ decimal, units, months, monthFirst }: FormatConfig) {
  const number = (value: number, digits = 1): string => {
    const factor = 10 ** digits;
    return String(Math.round(value * factor) / factor).replace('.', decimal);
  };

  return {
    units,
    number,
    duration(seconds: number): string {
      const minutes = Math.max(1, Math.round(seconds / 60));
      if (minutes < 60) return `${minutes} ${units.min}`;
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m === 0 ? `${h} ${units.h}` : `${h} ${units.h} ${m} ${units.min}`;
    },
    // Сначала округляем, потом выбираем единицы: иначе 995 м превращаются в «1000 м», а не в «1 км»
    distance(meters: number): string {
      const rounded = Math.round(meters / 10) * 10;
      if (rounded < 1000) return `${rounded} ${units.m}`;
      return `${number(meters / 1000, meters < 10000 ? 1 : 0)} ${units.km}`;
    },
    co2(grams: number): string {
      const rounded = Math.round(grams);
      if (rounded < 1000) return `${rounded} ${units.g}`;
      return `${number(grams / 1000, grams < 10000 ? 1 : 0)} ${units.kg}`;
    },
    date(iso: string): string {
      const d = new Date(iso);
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const month = months[d.getMonth()];
      return `${monthFirst ? `${month} ${d.getDate()}` : `${d.getDate()} ${month}`}, ${time}`;
    },
  };
}

/** pluralRu(5, ['день', 'дня', 'дней']) → 'дней' */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.round(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
