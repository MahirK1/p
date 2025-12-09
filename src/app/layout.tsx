import "./globals.css";
import type { ReactNode } from "react";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Italgroup B2B Portal",
  description: "B2B portal za komercijaliste - Italgroup",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Italgroup Portal",
  },
  icons: {
    icon: "/italgroup-logo.png",
    apple: "/italgroup-logo.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bs">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Italgroup Portal" />
        <link rel="apple-touch-icon" href="/italgroup-logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AuthSessionProvider>
          <ToastProvider>
            <ServiceWorkerRegistration />
            {children}
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}