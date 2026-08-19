import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUPPORTED_LOCALES } from "../src/i18n/config";
import { MESSAGE_NAMESPACES } from "../src/i18n/load-messages";

function flatten(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
      flatten(nested, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

const root = join(import.meta.dirname, "..");
const enKeys = new Map<string, string[]>();

for (const ns of MESSAGE_NAMESPACES) {
  const en = JSON.parse(readFileSync(join(root, `src/i18n/locales/en/${ns}.json`), "utf8"));
  enKeys.set(ns, flatten(en));
}

let failed = false;
for (const locale of SUPPORTED_LOCALES) {
  for (const ns of MESSAGE_NAMESPACES) {
    const data = JSON.parse(
      readFileSync(join(root, `src/i18n/locales/${locale}/${ns}.json`), "utf8"),
    );
    const keys = flatten(data);
    const expected = enKeys.get(ns) ?? [];
    for (const key of expected) {
      if (!keys.includes(key)) {
        console.error(`Missing ${locale}/${ns}: ${key}`);
        failed = true;
      }
    }
    for (const key of keys) {
      if (!expected.includes(key)) {
        console.error(`Extra ${locale}/${ns}: ${key}`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log("i18n keys match en for", SUPPORTED_LOCALES.join(", "));
