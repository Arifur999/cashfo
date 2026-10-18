import Input from "@/components/smartly/form/Input";
import { currencySymbol } from "@/lib/customer/currency";
import { normalizeMoneyInput } from "@/lib/customer/money";

interface AmountInputProps {
  id: string;
  value: string;
  // Gets the amount as typed, cleaned up (Bangla digits too, one point).
  onChange: (value: string) => void;
  currency: string;
  autoFocus?: boolean;
  invalid?: boolean;
}

// A drawer's amount box: the currency sign in a sand cell on the left and
// the figure large beside it. 58px tall: the boards draw it 56px inside
// its border.
const AmountInput = ({ id, value, onChange, currency, autoFocus = false, invalid = false }: AmountInputProps) => (
  <Input
    id={id}
    type="text"
    inputMode="decimal"
    size="xl"
    value={value}
    onChange={(event) => onChange(normalizeMoneyInput(event.target.value))}
    placeholder="0"
    autoFocus={autoFocus}
    invalid={invalid}
    leading={<span className="flex h-14 w-13 items-center justify-center border-r border-line bg-cream text-h2 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
    frameClassName="h-14.5 gap-0 overflow-hidden pl-0"
    className="pl-4 text-h2 tabular-nums"
  />
);

export default AmountInput;
