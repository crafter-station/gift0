import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPriorityLabel(priority: "high" | "medium" | "low"): string {
  const labels = {
    low: "Almost Free",
    medium: "Budget Friendly",
    high: "Financial Regret",
  }
  return labels[priority]
}
