import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@/styles/uploads.css';
import '@/styles/public.css';

export const metadata: Metadata = { title: 'NMedia — stories with a pulse', description: 'A cinematic streaming experience.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
