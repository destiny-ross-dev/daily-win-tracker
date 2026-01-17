// =========================================================
// 2) app/layout.tsx  (wrap the whole app)
// If you already have a layout.tsx, just add the provider.
// =========================================================

import "./globals.css";
import AuthProvider from "../components/providers/AuthProvider";

export const metadata = {
  title: "App",
  description: "Next.js + Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
