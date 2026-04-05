import { useState } from "react";
import { formatEther } from "viem";
import { useChainId } from "wagmi";
import { useAsset, useNextAssetId, useMintFractions } from "../hooks/useMaungRWA";
import { useTVL } from "../hooks/useTVL";
import { fmtApy, fmtPct, fmtDuration, calcMintTotal, calcAnnualYield, STATUS_LABELS } from "../utils/format";
import { CHAIN_NAMES } from "../wagmi.config";
import HeroStats from "./HeroStats";

/* ─── Asset Card ─────────────────────────────────────────────────────────── */
function AssetCard({ assetId, selected, onSelect }) {
  const { asset, isLoading } = useAsset(assetId);
  if (isLoading || !asset) return <div className="asset-card skeleton" />;

  const isVehicle = asset.assetType === 0;
  const pct = fmtPct(asset.soldFractions, asset.totalFractions);

  return (
    <div className={`asset-card${selected ? " selected" : ""}`} onClick={() => onSelect(assetId)}>
      <div className={`asset-img ${isVehicle ? "vehicle" : "invoice"}`}>
        <span className={`asset-tag ${isVehicle ? "tag-vehicle" : "tag-invoice"}`}>
          {isVehicle ? "VEHICLE" : "INVOICE"}
        </span>
        <span className="yield-badge">{fmtApy(asset.apyBps)} APY</span>
        <span className="emoji">{isVehicle ? "🚗" : "📄"}</span>
      </div>
      <div className="asset-body">
        <div className="asset-name">{asset.name}</div>
        <div className="asset-sub">{asset.location} · {STATUS_LABELS[asset.status]}</div>
        <div className="progress-wrap">
          <div className="progress-label"><span>Funded</span><span>{pct}%</span></div>
          <div className="progress-bar">
            <div className={`progress-fill${!isVehicle ? " green" : ""}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="asset-footer">
          <div className="frac-price">{formatEther(asset.fractionPrice)} POL / frac</div>
          <div className="frac-count">{asset.soldFractions.toString()} / {asset.totalFractions.toString()}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── NFT Detail ─────────────────────────────────────────────────────────── */
function NFTDetail({ assetId }) {
  const { asset } = useAsset(assetId);
  const chainId   = useChainId();
  const chainName = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;

  if (!asset) return <div className="empty-state">Select an asset.</div>;
  const isVehicle = asset.assetType === 0;

  return (
    <div className="nft-detail">
      <div className="nft-hero">
        <div className="nft-icon">{isVehicle ? "🚗" : "📄"}</div>
        <div className="nft-info">
          <div className="name">{asset.name}</div>
          <div className="id">TOKEN ID: #{String(assetId).padStart(4,"0")} · ERC-1155</div>
          <div className="chain">⬡ {chainName}</div>
        </div>
      </div>
      <div className="attr-grid">
        <div className="attr"><div className="attr-key">ASSET TYPE</div><div className="attr-val">{isVehicle ? "Rental Vehicle" : "Trade Invoice"}</div></div>
        <div className="attr"><div className="attr-key">TOTAL VALUE</div><div className="attr-val gold">{formatEther(asset.totalValue)} POL</div></div>
        <div className="attr"><div className="attr-key">FRACTION PRICE</div><div className="attr-val">{formatEther(asset.fractionPrice)} POL</div></div>
        <div className="attr"><div className="attr-key">APY YIELD</div><div className="attr-val green">{fmtApy(asset.apyBps)}</div></div>
        <div className="attr"><div className="attr-key">TOTAL FRACTIONS</div><div className="attr-val">{asset.totalFractions.toString()}</div></div>
        <div className="attr"><div className="attr-key">MATURITY</div><div className="attr-val">{fmtDuration(asset.maturityDuration)}</div></div>
      </div>
    </div>
  );
}

/* ─── Mint Panel ─────────────────────────────────────────────────────────── */
function MintPanel({ assetId }) {
  const [qty, setQty] = useState(5);
  const { asset } = useAsset(assetId);
  const { mint, isPending, isConfirming, isSuccess } = useMintFractions();
  if (!asset) return null;

  const { cost, fee, total } = calcMintTotal(asset.fractionPrice, qty);
  const estYield = calcAnnualYield(asset.fractionPrice, qty, asset.apyBps);
  const unavailable = asset.status !== 0 || asset.soldFractions >= asset.totalFractions;

  return (
    <div className="invest-panel">
      <div className="fracs-input-wrap">
        <span className="fracs-label">FRACTIONS</span>
        <div className="fracs-ctrl">
          <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span className="qty-val">{qty}</span>
          <button className="qty-btn" onClick={() => setQty(q => Math.min(100, q + 1))}>+</button>
        </div>
      </div>
      <div className="summary">
        <div className="summary-row"><span className="s-key">Unit price</span><span className="s-val">{formatEther(asset.fractionPrice)} POL</span></div>
        <div className="summary-row"><span className="s-key">Subtotal</span><span className="s-val">{formatEther(cost)} POL</span></div>
        <div className="summary-row"><span className="s-key">Protocol fee (1%)</span><span className="s-val">{formatEther(fee)} POL</span></div>
        <div className="summary-row"><span className="s-key">Est. annual yield</span><span className="s-val">{estYield.toFixed(4)} POL</span></div>
        <div className="summary-row total"><span className="s-key">TOTAL</span><span className="s-val">{formatEther(total)} POL</span></div>
      </div>
      {unavailable ? (
        <button className="invest-btn" disabled>
          {asset.soldFractions >= asset.totalFractions ? "Sold Out" : "Not in Funding Phase"}
        </button>
      ) : (
        <button
          className="invest-btn gold"
          onClick={() => mint({ assetId, amount: qty, fractionPrice: asset.fractionPrice })}
          disabled={isPending || isConfirming}
        >
          {isPending ? "Confirm in wallet…" : isConfirming ? "Waiting for block…" : "Mint Fractions →"}
        </button>
      )}
      {isSuccess && <div className="tx-success">✓ Minted! Transaction confirmed on-chain.</div>}
    </div>
  );
}

/* ─── Market Tab ─────────────────────────────────────────────────────────── */
export default function MarketTab() {
  const { nextAssetId } = useNextAssetId();
  const { totalPOL }    = useTVL();           // ← TVL real dari chain
  const [selected, setSelected] = useState(0);
  const ids = Array.from({ length: nextAssetId }, (_, i) => i);

  return (
    <div className="market-tab">
      <HeroStats
        label1="TOTAL ASSETS"
        value1={`${nextAssetId} Pool${nextAssetId !== 1 ? "s" : ""}`}
        sub1="Vehicles & Invoices tokenized"
        badge1="Live on Polygon Amoy"
        label2="PROTOCOL TVL"
        value2={<>{totalPOL} <span style={{fontSize:"16px",fontWeight:500}}>POL</span></>}
        sub2={`Total nilai terkunci di ${nextAssetId} pool`}
        badge2="Data real-time dari blockchain"
      />
      <div className="section-title">Live RWA Assets</div>
      {ids.length === 0
        ? <div className="empty-state center">No assets deployed yet.</div>
        : <div className="assets-grid">{ids.map(id => <AssetCard key={id} assetId={id} selected={selected === id} onSelect={setSelected} />)}</div>
      }
      <div className="two-col">
        <div className="panel"><div className="panel-title">NFT Details</div><NFTDetail assetId={selected} /></div>
        <div className="panel"><div className="panel-title">Buy Fractions</div><MintPanel assetId={selected} /></div>
      </div>
    </div>
  );
}