export const metadata = {
  title: "Commentaid — Turn Comments Into Conversations",
  description:
    "AI-powered comment assistance for creators and businesses. Translate, reply faster, resolve issues, and discover sales opportunities."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
