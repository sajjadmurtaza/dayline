import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, parseLocale } from "./config";
import { loadMessages } from "./load-messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale, locale: explicit }) => {
  const requested = explicit ?? (await requestLocale);
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : parseLocale(requested) === requested
      ? parseLocale(requested)
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: await loadMessages(parseLocale(locale)),
  };
});
