import { formatEther } from "viem";
import { useNextAssetId, useAsset, useFractionBalance } from "../hooks/useMaungRWA";
import { fmtEth } from "../utils/format";

/**
 * Aggregate stats across all assets
 */
function useGlobalStats(address) {
  const { nextAssetId } = useNextAssetId();
  const ids = Array.from({ length: nextAssetId }, (_, i) => i);

  // Kita aggregate di sini secara naive — di produksi pakai subgraph/indexer
  let tvl = 0n;
  let portfolioValue = 0n;

  // Karena hooks tidak bisa di-loop, kita hitung di komponen
  // (di produksi ini diganti dengan 1 call ke subgraph)
  return { ids, nextAssetId };
}

/**
 * HeroStats — 2 stat cards di atas setiap tab
 */
export default function HeroStats({ label1, value1, sub1, badge1, label2, value2, sub2, badge2 }) {
  return (
    <div className="hero">
      <div className="hero-stat">
        <div className="label">{label1}</div>
        <div className="value">{value1}</div>
        {sub1   && <div className="sub">{sub1}</div>}
        {badge1 && <div className="badge">{badge1}</div>}
      </div>
      <div className="hero-stat">
        <div className="label">{label2}</div>
        <div className="value">{value2}</div>
        {sub2   && <div className="sub">{sub2}</div>}
        {badge2 && <div className="badge">{badge2}</div>}
      </div>
    </div>
  );
}
