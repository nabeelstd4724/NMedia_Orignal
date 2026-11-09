'use client';

import type { ReactNode } from 'react';

export interface AdminDataTableColumn<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
}

export function AdminDataTable<Row>({ caption, rows, columns, rowKey, empty }: {
  caption: string;
  rows: Row[];
  columns: AdminDataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  empty: ReactNode;
}) {
  return <div className="admin-table-wrap"><table className="admin-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table>{rows.length === 0 && empty}</div>;
}
