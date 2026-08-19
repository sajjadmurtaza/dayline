import { Noto_Nastaliq_Urdu } from "next/font/google";

export const script = Noto_Nastaliq_Urdu({
  variable: "--font-script",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
