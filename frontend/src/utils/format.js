import { formatEther } from "viem";

/**
 * Format ETH value dengan desimal yang rapi
 * @param {bigint} wei - nilai dalam wei
 * @param {number} decimals - jumlah desimal (default 4)
 */
export function fmtEth(wei, decimals = 4) {
  if (wei === undefined || wei === null) return "0";
  return Number(formatEther(wei)).toFixed(decimals);
}

/**
 * Format APY dari basis points ke persen
 * @param {bigint|number} bps - basis points (1420 = 14.20%)
 */
export function fmtApy(bps) {
  return (Number(bps) / 100).toFixed(2) + "%";
}

/**
 * Format funding percentage
 * @param {bigint} sold - fractions terjual
 * @param {bigint} total - total fractions
 */
export function fmtPct(sold, total) {
  if (!total || total === 0n) return 0;
  return Number((sold * 100n) / total);
}

/**
 * Format timestamp Unix ke tanggal lokal
 * @param {bigint|number} ts - unix timestamp
 */
export function fmtDate(ts) {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format durasi detik ke hari/bulan
 * @param {bigint|number} seconds
 */
export function fmtDuration(seconds) {
  const days = Math.floor(Number(seconds) / 86400);
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""}`;
  }
  return `${days} days`;
}

/**
 * Hitung estimasi yield tahunan
 * @param {bigint} fractionPrice - harga per fraction (wei)
 * @param {number} qty - jumlah fractions
 * @param {bigint|number} apyBps - APY dalam basis points
 */
export function calcAnnualYield(fractionPrice, qty, apyBps) {
  const invested = Number(formatEther(fractionPrice)) * qty;
  return (invested * Number(apyBps)) / 10_000;
}

/**
 * Hitung total biaya mint termasuk protocol fee
 * @param {bigint} fractionPrice
 * @param {number} qty
 * @param {number} feeBps - default 100 (1%)
 */
export function calcMintTotal(fractionPrice, qty, feeBps = 100) {
  const cost = fractionPrice * BigInt(qty);
  const fee  = (cost * BigInt(feeBps)) / 10_000n;
  return { cost, fee, total: cost + fee };
}

/**
 * Shorten address: 0x1234...abcd
 */
export function shortAddr(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Asset status label
 */
export const STATUS_LABELS = ["FUNDING", "ACTIVE", "MATURED", "CANCELLED"];
export const ASSET_TYPE_LABELS = ["VEHICLE", "INVOICE"];
