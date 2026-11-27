import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Commentaid — Turn Comments Into Conversations",
  description:
    "AI-powered multilingual comment assistance for creators and businesses.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
