import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useEffect } from "react";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Custom hook for debouncing values
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Formats a date string to a localized format
 * @param dateString Date string in ISO format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  
  // Parse the date
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  // Options for date formatting
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  // Return formatted date
  return date.toLocaleDateString(undefined, options);
}

/**
 * Format a number with commas as thousands separators
 * @param num Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Truncate text with ellipsis if it exceeds the specified length
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Get initials from a name
 * @param name Full name
 * @param limit Maximum number of initials
 * @returns Initials
 */
export function getInitials(name: string, limit = 2): string {
  if (!name) return "";
  
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, limit)
    .join("")
    .toUpperCase();
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param num Number
 * @returns Ordinal suffix
 */
export function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
}

/**
 * Get a readable label for tournament types
 * @param type Tournament type ('major', 'tour', 'league', 'supr')
 * @returns Readable label
 */
export function getTournamentTypeLabel(type: string): string {
  switch (type) {
    case 'major':
      return 'Major Event';
    case 'tour':
      return 'Tour Event';
    case 'league':
      return 'League Event';
    case 'supr':
      return 'SUPR Club Event';
    default:
      return type;
  }
}

/**
 * Get a readable label for tournament status
 * @param status Tournament status ('completed', 'in-progress', 'upcoming')
 * @returns Readable label
 */
export function getTournamentStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In Progress';
    case 'upcoming':
      return 'Upcoming';
    default:
      return status;
  }
}

/**
 * Safe JSON parse with fallback
 * @param str String to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed JSON or fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    return fallback;
  }
}

/**
 * Download a file from a blob
 * @param blob Blob to download
 * @param fileName Name for the downloaded file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Custom hook for detecting mobile devices
 * @returns Boolean indicating if the device is mobile
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  return isMobile;
}
