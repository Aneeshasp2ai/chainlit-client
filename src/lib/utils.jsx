import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * @param {Array} inputs - Array of class values to be merged
 * @returns {string} Merged and deduplicated className string
 */
export const cn = (...inputs) => {
  return twMerge(clsx(inputs));
};