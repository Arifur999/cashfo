"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_GENERATOR, generatePassword, GENERATOR_LENGTHS, type GeneratorOptions } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PasswordGeneratorProps {
  onGenerate: (password: string) => void;
}

const OPTIONS: { key: keyof GeneratorOptions; label: string }[] = [
  { key: "upper", label: "A–Z" },
  { key: "lower", label: "a–z" },
  { key: "digits", label: "0–9" },
  { key: "symbols", label: "Symbols !@#" },
  { key: "noLookalikes", label: "No look-alikes (0/O, l/1)" },
];

// Random numbers from the browser's own source, never Math.random.
export const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

// The password the panel stands for when it first opens: its own starting
// length and options, so the two agree.
export const firstGenerated = () => generatePassword(GENERATOR_LENGTHS.initial, DEFAULT_GENERATOR, secureRandom);

// Length and character sets for a generated password; every change makes a
// new one.
export function PasswordGenerator({ onGenerate }: PasswordGeneratorProps) {
  const { t, locale } = useLocale();
  const [length, setLength] = useState<number>(GENERATOR_LENGTHS.initial);
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR);

  function make(nextLength = length, nextOptions = options) {
    onGenerate(generatePassword(nextLength, nextOptions, secureRandom));
  }

  function setOption(key: keyof GeneratorOptions, on: boolean) {
    const next = { ...options, [key]: on };
    setOptions(next);
    make(length, next);
  }

  return (
    <section aria-label={t("Password generator")} className="flex flex-col gap-3 rounded-md border border-line bg-strip px-4 py-3">
      <div className="flex items-center gap-3">
        {/* The slider's thumb carries its name; this is the length on show. */}
        <span aria-hidden="true" className="text-small font-semibold whitespace-nowrap text-ink-2 tabular-nums">
          {t("Length {count}", { count: formatCount(length, locale) })}
        </span>
        <Slider
          min={GENERATOR_LENGTHS.min}
          max={GENERATOR_LENGTHS.max}
          step={1}
          value={[length]}
          onValueChange={([value]) => {
            setLength(value);
            make(value);
          }}
          thumbProps={{ "aria-label": t("Password length") }}
          className="flex-1"
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => make()} className="h-7.5 px-3 text-small pointer-coarse:h-11">
          <RefreshCw className="size-3.5" />
          {t("New one")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {OPTIONS.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-center gap-2 text-small text-ink-2 pointer-coarse:min-h-11">
            <Checkbox checked={options[option.key]} onCheckedChange={(next) => setOption(option.key, next === true)} />
            {t(option.label)}
          </label>
        ))}
      </div>
    </section>
  );
}
