import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

/**
 * Merges tailwind classes and prevents conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function randomName() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: "-",
    style: "lowerCase",
  });
}

export function skipAuth() {
  return import.meta.env.DEV && import.meta.env.VITE_FORCE_AUTH !== "true";
}
