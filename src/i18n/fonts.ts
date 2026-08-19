import { Plus_Jakarta_Sans } from "next/font/google";
import type { SupportedLocale } from "./config";

export const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export async function scriptFont(locale: SupportedLocale) {
  switch (locale) {
    case "ar":
      return (await import("./fonts/ar")).script;
    case "ur":
      return (await import("./fonts/ur")).script;
    case "ja":
      return (await import("./fonts/ja")).script;
    case "hi":
      return (await import("./fonts/hi")).script;
    case "bn":
      return (await import("./fonts/bn")).script;
    case "ko":
      return (await import("./fonts/ko")).script;
    case "zh":
      return (await import("./fonts/zh")).script;
    case "ru":
      return (await import("./fonts/ru")).script;
    default:
      return null;
  }
}
