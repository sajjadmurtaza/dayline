import { describe, expect, it } from "vitest";
import {
  LANGUAGE_MENU_LOCALES,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
  htmlLang,
  parseLocale,
} from "./config";

describe("i18n config", () => {
  it("strips region tags and falls back to English", () => {
    expect(parseLocale("zh-CN")).toBe("zh");
    expect(parseLocale("en-US")).toBe("en");
    expect(parseLocale("pt-BR")).toBe("en");
    expect(parseLocale(undefined)).toBe("en");
  });

  it("marks Arabic and Urdu as RTL and Chinese as zh-Hans", () => {
    expect(RTL_LOCALES).toEqual(["ar", "ur"]);
    expect(htmlLang("zh")).toBe("zh-Hans");
    expect(htmlLang("ar")).toBe("ar");
    expect(LANGUAGE_MENU_LOCALES[0]).toBe("en");
    expect(LANGUAGE_MENU_LOCALES).toHaveLength(SUPPORTED_LOCALES.length);
  });
});
