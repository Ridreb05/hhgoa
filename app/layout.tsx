import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GhostShield | Graph-Based Transaction Risk Detection',
  description:
    'Detects coordinated wallet activity, transaction cycles, and shared funding structures using TigerGraph and GSQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-[#f4f5f7] font-sans antialiased selection:bg-[#ff951f]/20 selection:text-[#ff951f]">
        {children}
      </body>
    </html>
  );
}
