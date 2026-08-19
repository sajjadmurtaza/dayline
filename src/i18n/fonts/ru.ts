import { Noto_Sans } from "next/font/google";

export const script = Noto_Sans({
  variable: "--font-script",
  subsets: ["cyrillic", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});
