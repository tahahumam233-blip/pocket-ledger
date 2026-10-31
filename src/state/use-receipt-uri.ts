import { useEffect, useState } from 'react';

import { useLedgerStore } from './ledger-store';

/** Resolves a stored receipt image to a uri an image component can show. */
export function useReceiptUri(fileName: string | null | undefined): string | null {
  const services = useLedgerStore((state) => state.services);
  const [resolved, setResolved] = useState<{ fileName: string; uri: string } | null>(null);

  useEffect(() => {
    if (!services || !fileName) return;
    let cancelled = false;
    services.receipts
      .resolveUri({ fileName })
      .then((uri) => {
        if (!cancelled) setResolved({ fileName, uri });
      })
      .catch(() => {
        if (!cancelled) setResolved({ fileName, uri: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [services, fileName]);

  return resolved && resolved.fileName === fileName ? resolved.uri : null;
}
