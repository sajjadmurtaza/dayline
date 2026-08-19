import { Noto_Sans_SC } from "next/font/google";

export const script = Noto_Sans_SC({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});
