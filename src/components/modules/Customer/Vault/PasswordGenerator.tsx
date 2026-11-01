"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_GENERATOR, generatePassword, GENERATOR_LENGTHS, type GeneratorOptions } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// What the generator makes: its length and character sets.
export interface GeneratorSettings {
  length: number;
  options: GeneratorOptions;
}

export const DEFAULT_SETTINGS: GeneratorSettings = { length: GENERATOR_LENGTHS.initial, options: DEFAULT_GENERATOR };

const OPTIONS: { key: keyof GeneratorOptions; label: string }[] = [
  { key: "upper", label: "A–Z" },
  { key: "lower", label: "a–z" },
  { key: "digits", label: "0–9" },
  { key: "symbols", label: "Symbols !@#" },
  { key: "noLookalikes", label: "No look-alikes (0/O, l/1)" },
];

// Random numbers from the browser's own source, never Math.random.
export const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export const makePassword = (settings: GeneratorSettings) => generatePassword(settings.length, settings.options, secureRandom);

interface PasswordGeneratorProps {
  settings: GeneratorSettings;
  // A change makes a new password with the new settings.
  onChange: (settings: GeneratorSettings) => void;
}

// Password options (folded under the password): the length and the kinds
// of characters. Every change makes a new password; at least one set stays on.
export function PasswordGenerator({ settings, onChange }: PasswordGeneratorProps) {
  const { t, fmt } = useLocale();

  function setOption(key: keyof GeneratorOptions, on: boolean) {
    const options = { ...settings.options, [key]: on };
    if (!options.upper && !options.lower && !options.digits && !options.symbols) return;
    onChange({ ...settings, options });
  }

  return (
    <section aria-label={t("Password options")} className="flex flex-col gap-2.5 rounded-xl border border-divider bg-strip px-3.5 py-3">
      <div className="flex items-center gap-3">
        {/* The slider's thumb carries its name; this is the length on show. */}
        <span aria-hidden="true" className="w-21.5 text-[13.5px] font-medium whitespace-nowrap text-ink tabular-nums">
          {t("Length {count}", { count: formatCount(settings.length, fmt) })}
        </span>
        <Slider min={GENERATOR_LENGTHS.min} max={GENERATOR_LENGTHS.max} step={1} value={[settings.length]} onValueChange={([value]) => onChange({ ...settings, length: value })} thumbProps={{ "aria-label": t("Password length") }} className="flex-1" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {OPTIONS.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-center gap-1.75 text-[13px] text-ink-2 pointer-coarse:min-h-11">
            <Checkbox checked={settings.options[option.key]} onCheckedChange={(next) => setOption(option.key, next === true)} />
            {t(option.label)}
          </label>
        ))}
      </div>
    </section>
  );
}
