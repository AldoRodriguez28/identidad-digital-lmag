import type { Metadata, Viewport } from "next";
import { Montserrat, Caveat } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "./sw-register";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: "Identidad Digital Juvenil",
  title: "Identidad Digital Juvenil",
  description: "Tu credencial digital juvenil: puntos, eventos y beneficios.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Identidad" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
