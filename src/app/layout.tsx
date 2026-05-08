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
      <body style={{ position: "relative", zIndex: 1 }}>{children}</body>
    </html>
  );
}
