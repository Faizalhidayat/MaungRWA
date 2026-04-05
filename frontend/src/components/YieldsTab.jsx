import { formatEther } from "viem";
import { useNextAssetId, useYieldHistory, usePendingYield, useClaimYield, useFractionBalance } from "../hooks/useMaungRWA";
import { fmtDate } from "../utils/format";
import HeroStats from "./HeroStats";

function YieldRow({ dist }) {
  return (
    <div className="yield-row">
      <div className="yield-left">
        <div className="y-name">{dist.note || "Yield Distribution"}</div>
        <div className="y-date">{fmtDate(dist.timestamp)}</div>
      </div>
      <div className="yield-right">
        <div className="y-amt">+{Number(formatEther(dist.amount)).toFixed(4)} ETH</div>
        <div className="y-status">DISTRIBUTED</div>
      </div>
    </div>
  );
}

function AssetYieldSection({ assetId, address }) {
  const balance            = useFractionBalance(assetId, address);
  const { history }        = useYieldHistory(assetId);
  const { pending, refetch }= usePendingYield(assetId, address);
  const { claim, isPending, isConfirming, isSuccess } = useClaimYield();

  if (balance === 0) return null;

  const hasPending = Number(pending) > 0;

  const handleClaim = () => {
    claim(assetId);
    setTimeout(refetch, 3000);
  };

  return (
    <div className="asset-yield-section">
      <div className="ay-header">
        <span className="ay-title">Asset #{String(assetId).padStart(4,"0")}</span>
        <span className="ay-balance">{balance} fractions held</span>
        {hasPending && (
          <button className="claim-btn" onClick={handleClaim} disabled={isPending || isConfirming}>
            {isPending ? "Confirm…" : isConfirming ? "Waiting…" : `Claim ${Number(pending).toFixed(4)} ETH →`}
          </button>
        )}
      </div>

      <div className="yield-list">
        {history.length === 0
          ? <div className="empty-state">No distributions yet for this asset.</div>
          : history.map((d, i) => <YieldRow key={i} dist={d} />)
        }
      </div>

      {isSuccess && <div className="tx-success" style={{marginTop:8}}>✓ Yield claimed successfully!</div>}
    </div>
  );
}

export default function YieldsTab({ address }) {
  const { nextAssetId } = useNextAssetId();
  const ids = Array.from({ length: nextAssetId }, (_, i) => i);

  if (!address) return (
    <div className="empty-state center">Connect your wallet to view yield history.</div>
  );

  return (
    <div className="yields-tab">
      <HeroStats
        label1="CLAIMABLE YIELD" value1="Check wallet"
        sub1="Per asset shown below" badge1="Pull to refresh"
        label2="NEXT DISTRIBUTION" value2="Monthly"
        sub2="Owner pushes on-chain" badge2="Transparent on Polygon"
      />
      <div className="section-title">Yield History</div>
      <div className="panel" style={{display:"flex", flexDirection:"column", gap:"1.5rem"}}>
        {ids.map(id => <AssetYieldSection key={id} assetId={id} address={address} />)}
      </div>
    </div>
  );
}
