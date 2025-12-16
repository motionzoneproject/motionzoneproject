import { useEffect, useState } from "react";

/**
 * A Custom hook for debouncing a value with a delay!
 * @param {string} value - The value to debounce (if it changes, then this hook will be triggered and you should use debouncedSearch constant that will change after the delay.)
 * @param {number} delay - Delay in milliseconds before updating
 * @returns {string | undefined} The debounced value
 * @example
 * const debouncedSearch = useDebounce(searchInput, 500);
 * // searchInput could be from useState or an input field's onChange event
 */
export default function useDebounce(
  value: string,
  delay: number,
): string | undefined {
  const [bValue, setBValue] = useState<string>();

  useEffect(() => {
    const debounce = setTimeout(() => {
      setBValue(value);
    }, delay);

    return () => {
      clearTimeout(debounce);
    };
  }, [value, delay]);

  return bValue;
}
