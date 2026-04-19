import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatPercent(value: number | string): string {
  return `${Number(value).toFixed(2)}%`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function daysRemaining(endDate: Date | string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calcDailyInterest(
  principal: number,
  apr: number
): number {
  return (principal * apr) / 365;
}

export function calcProjectedPayout(
  principal: number,
  apr: number,
  startDate: Date | string,
  maturityDate: Date | string
): number {
  const start = new Date(startDate);
  const maturity = new Date(maturityDate);
  const days = Math.ceil(
    (maturity.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const totalInterest = principal * apr * (days / 365);
  return principal + totalInterest;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
