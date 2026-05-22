import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import ClientLayout from "@/components/ClientLayout";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

export const metadata: Metadata = {
  title: "KanjiDual — Real-time Kanji Battle",
  description:
    "Challenge players worldwide to kanji duels. Type the correct meaning or reading first to win the round. Climb the ranked ladder.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KanjiDual",
  },
};

export const viewport: Viewport = {
  themeColor: "#CF4520",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        {/* Apply theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var theme = localStorage.getItem('pref_theme') || 'navy';
            var grid = localStorage.getItem('pref_grid') || 'normal';
            var kanji = localStorage.getItem('pref_kanji_size') || 'normal';
            var hc = localStorage.getItem('pref_high_contrast') === 'true';
            var b = document.documentElement;
            b.classList.add('theme-' + theme);
            b.classList.add('grid-' + grid);
            if (kanji !== 'normal') b.classList.add('kanji-' + kanji);
            if (hc) b.classList.add('high-contrast');
          } catch(e) {}
        ` }} />
      </head>
      <body style={{ position: "relative", zIndex: 1 }}>
        <PresenceProvider>
          <NotificationsProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </NotificationsProvider>
        </PresenceProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
