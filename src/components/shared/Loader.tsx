import { cn } from "@/lib/utils";
import T from "./T";

interface LoaderProps {
  size?: number;
  onDark?: boolean;
  label?: string;
  className?: string;
}

// Drives the pure-CSS .app-loader spinner in globals.css through an inline
// custom property, so any size works without a new class.
const Loader = ({ size = 24, onDark = false, label, className }: LoaderProps) => {
  return (
    <span
      className={cn("app-loader", onDark && "app-loader--on-dark", className)}
      style={{ ["--loader-size" as string]: `${size}px` }}
      role="status"
    >
      <span className="sr-only">
        <T>{label ?? "Loading"}</T>
      </span>
    </span>
  );
};

export default Loader;
