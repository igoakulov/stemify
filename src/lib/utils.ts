import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function format_relative_date(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const is_same_day = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  
  const is_current_year = date.getFullYear() === now.getFullYear();
  
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  
  if (is_same_day) {
    return `Today at ${time}`;
  }
  
  if (is_current_year) {
    return `${month} ${day} at ${time}`;
  }
  
  return `${month} ${day}, ${date.getFullYear()} at ${time}`;
}
