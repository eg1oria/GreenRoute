import { useEffect, useState } from 'react';

import { SOURCE_LANGUAGE, translateText } from '@/api/translate';
import type { Language } from '@/i18n/languages';

type Result = { key: string; texts: string[]; failed: boolean };

/**
 * Переводит тексты на язык интерфейса. Пока перевод не готов или если он не удался,
 * возвращает оригиналы. texts должен быть мемоизирован — иначе перевод запускается на каждый рендер.
 */
export function useTranslatedTexts(texts: string[], language: Language) {
  const needed = language !== SOURCE_LANGUAGE && texts.length > 0;
  const key = language + '\u0000' + texts.join('\u0001');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!needed) return;
    const controller = new AbortController();
    Promise.allSettled(texts.map((text) => translateText(text, language, controller.signal))).then((settled) => {
      if (controller.signal.aborted) return;
      setResult({
        key,
        texts: settled.map((item, i) => (item.status === 'fulfilled' ? item.value : texts[i])),
        failed: settled.some((item) => item.status === 'rejected'),
      });
    });
    return () => controller.abort();
  }, [needed, key, texts, language]);

  const current = needed && result?.key === key ? result : null;
  return {
    texts: current?.texts ?? texts,
    /** тексты показаны на другом языке, чем пришли из API */
    translated: needed && current !== null && !current.failed,
    translating: needed && current === null,
    failed: current?.failed ?? false,
  };
}
