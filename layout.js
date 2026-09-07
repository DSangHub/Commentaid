export const metadata = {
  title: "Commentaid — Comment Monitor",
  description: "Live YouTube comment monitoring dashboard."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
