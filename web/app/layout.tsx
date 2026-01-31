import '../styles/globals.css';

export const metadata = {
  title: 'Mail TraceX',
  description: 'Analytics dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
