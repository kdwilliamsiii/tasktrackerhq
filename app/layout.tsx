import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/700.css";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/600.css";
import "@fontsource/merriweather/400.css";
import AuthProvider from "../components/AuthProvider";
import Layout from "../components/Layout";
import PwaRegister from "../components/PwaRegister";

export const metadata: Metadata = {
  title: "TaskTrackerHQ",
  description: "Tasks, calendars, and focus in one productivity workspace.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TaskTrackerHQ",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#475569",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <PwaRegister />
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
}
