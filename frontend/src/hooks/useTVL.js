import { useNextAssetId, useAsset } from "./useMaungRWA";
import { formatEther } from "viem";

/**
 * Hitung TVL real dari semua asset di contract.
 * TVL = sum of (soldFractions × fractionPrice) per asset
 */
function useAssetTVL(assetId) {
  const { asset } = useAsset(assetId);
  if (!asset) return 0n;
  return asset.soldFractions * asset.fractionPrice; // wei
}

export function useTVL() {
  const { nextAssetId } = useNextAssetId();

  // Kumpulkan TVL tiap asset
  // (hook dipanggil dengan jumlah tetap — max 20 asset)
  const a0  = useAssetTVL(0);
  const a1  = useAssetTVL(1);
  const a2  = useAssetTVL(2);
  const a3  = useAssetTVL(3);
  const a4  = useAssetTVL(4);
  const a5  = useAssetTVL(5);
  const a6  = useAssetTVL(6);
  const a7  = useAssetTVL(7);
  const a8  = useAssetTVL(8);
  const a9  = useAssetTVL(9);
  const a10 = useAssetTVL(10);
  const a11 = useAssetTVL(11);
  const a12 = useAssetTVL(12);
  const a13 = useAssetTVL(13);
  const a14 = useAssetTVL(14);
  const a15 = useAssetTVL(15);
  const a16 = useAssetTVL(16);
  const a17 = useAssetTVL(17);
  const a18 = useAssetTVL(18);
  const a19 = useAssetTVL(19);

  const all = [a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,a15,a16,a17,a18,a19];

  // Ambil hanya sejumlah asset yang exist
  const totalWei = all.slice(0, nextAssetId).reduce((sum, v) => sum + v, 0n);
  const totalPOL = Number(formatEther(totalWei)).toFixed(4);

  return { totalWei, totalPOL, nextAssetId };
}
