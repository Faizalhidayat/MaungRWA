import { formatEther } from "viem";
import { useNextAssetId, useAsset, useFractionBalance } from "../hooks/useMaungRWA";
import { fmtApy, calcAnnualYield } from "../utils/format";
import HeroStats from "./HeroStats";

function HoldingRow({ assetId, address }) {
  const { asset } = useAsset(assetId);
  const balance   = useFractionBalance(assetId, address);
  if (!asset || balance === 0) return null;
  const isVehicle = asset.assetType === 0;
  const invested  = Number(formatEther(asset.fractionPrice)) * balance;
  const estYield  = calcAnnualYield(asset.fractionPrice, balance, asset.apyBps);
  return (
    <tr>
      <td>
        <div className="t-name">{asset.name}</div>
        <div className="t-id">#{String(assetId).padStart(4,"0")} · {asset.location}</div>
      </td>
      <td><span className={`type-badge ${isVehicle ? "type-v" : "type-i"}`}>{isVehicle ? "VEHICLE" : "INVOICE"}</span></td>
      <td className="value-cell">{balance}</td>
      <td className="value-cell">{invested.toFixed(4)} ETH</td>
      <td className="value-cell">{fmtApy(asset.apyBps)}</td>
      <td className="pnl-pos">+{estYield.toFixed(4)} ETH/yr</td>
    </tr>
  );
}

export default function PortfolioTab({ address }) {
  const { nextAssetId } = useNextAssetId();
  const ids = Array.from({ length: nextAssetId }, (_, i) => i);

  if (!address) return (
    <div className="empty-state center">Connect your wallet to view your portfolio.</div>
  );

  return (
    <div className="portfolio-tab">
      <HeroStats
        label1="YOUR HOLDINGS" value1={`${nextAssetId} Pools`}
        sub1="Fractional RWA positions" badge1="On-chain verified"
        label2="EST. ANNUAL YIELD" value2="Varies"
        sub2="Based on current APY rates" badge2="Monthly distributions"
      />
      <div className="section-title">My Holdings</div>
      <div className="portfolio panel">
        <table className="port-table">
          <thead>
            <tr>
              <th>ASSET</th><th>TYPE</th><th>FRACTIONS</th>
              <th>INVESTED</th><th>APY</th><th>EST. ANNUAL YIELD</th>
            </tr>
          </thead>
          <tbody>
            {ids.map(id => <HoldingRow key={id} assetId={id} address={address} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
