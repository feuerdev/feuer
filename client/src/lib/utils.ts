import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges tailwind classes and prevents conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
