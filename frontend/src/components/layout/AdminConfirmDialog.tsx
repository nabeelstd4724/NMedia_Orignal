'use client';

export function AdminConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="admin-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-dialog-title"><p className="admin-kicker">CONFIRM ACTION</p><h3 id="admin-dialog-title">{title}</h3><p>{description}</p><div className="admin-dialog-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancel</button><button type="button" className="button button-primary" onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
