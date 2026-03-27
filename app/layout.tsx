import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@mantine/core/styles.css";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import "./globals.css";
import "./music-theme.css";
import { practiceMantineTheme } from "@/lib/mantine-theme";
import { AppDataProvider } from "@/components/AppDataProvider";
import { AppFrame } from "@/components/AppFrame";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Practice Companion",
  description: "Practice Companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      {...mantineHtmlProps}
      className={`${geistSans.variable} ${geistMono.variable} music-theme-root`}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={practiceMantineTheme} defaultColorScheme="auto">
          <AppDataProvider>
            <AppFrame>{children}</AppFrame>
          </AppDataProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
