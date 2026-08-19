import { Noto_Sans_Devanagari } from "next/font/google";

export const script = Noto_Sans_Devanagari({
  variable: "--font-script",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});
