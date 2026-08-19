import { Noto_Sans_Bengali } from "next/font/google";

export const script = Noto_Sans_Bengali({
  variable: "--font-script",
  subsets: ["bengali"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});
