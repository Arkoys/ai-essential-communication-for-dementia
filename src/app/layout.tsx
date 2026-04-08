import '../index.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dementia Clinical Assistant',
  description: 'Evidence-based decision support for primary care providers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
