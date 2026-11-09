'use client';

import { useEffect, useRef } from 'react';

export function PaymentsComingSoonDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return <div className="billing-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="billing-dialog" role="dialog" aria-modal="true" aria-labelledby="payments-dialog-title">
      <button ref={closeRef} className="billing-dialog-close" type="button" onClick={onClose} aria-label="Close payment information">×</button>
      <p className="kicker"><span className="kicker-line" />A LITTLE LONGER</p>
      <h2 id="payments-dialog-title">Payments are coming soon.</h2>
      <p>Premium is on its way. We’ll let you know when checkout is ready — your account won’t change until a payment is confirmed.</p>
      <button className="button button-primary" type="button" onClick={onClose}>Keep exploring <span aria-hidden="true">↗</span></button>
    </section>
  </div>;
}
