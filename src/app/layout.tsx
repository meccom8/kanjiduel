import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanjiDuel — Real-time Kanji Battle",
  description:
    "Challenge players worldwide to kanji duels. Type the correct meaning or reading first to win the round. Climb the ranked ladder.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
      <body style={{ position: "relative", zIndex: 1 }}>{children}</body>
    </html>
  );
}
