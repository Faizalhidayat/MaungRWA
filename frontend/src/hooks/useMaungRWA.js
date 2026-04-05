import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { MAUNGRWA_ABI } from "../abi/MaungRWA";
import { CONTRACT_ADDRESS } from "../wagmi.config";

// ─── Read: single asset ───────────────────────────────────────────────────────
export function useAsset(assetId) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MAUNGRWA_ABI,
    functionName: "getAsset",
    args: [BigInt(assetId)],
    enabled: assetId !== undefined,
  });
  return { asset: data, isLoading, refetch };
}

// ─── Read: total asset count ──────────────────────────────────────────────────
export function useNextAssetId() {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MAUNGRWA_ABI,
    functionName: "nextAssetId",
  });
  return { nextAssetId: data ? Number(data) : 0, isLoading };
}

// ─── Read: fraction balance of user ──────────────────────────────────────────
export function useFractionBalance(assetId, address) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MAUNGRWA_ABI,
    functionName: "balanceOf",
    args: [address, BigInt(assetId)],
    enabled: !!address && assetId !== undefined,
  });
  return data ? Number(data) : 0;
}

// ─── Read: pending yield ──────────────────────────────────────────────────────
export function usePendingYield(assetId, address) {
  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MAUNGRWA_ABI,
    functionName: "pendingYield",
    args: [BigInt(assetId), address],
    enabled: !!address && assetId !== undefined,
  });
  return {
    pending: data ? formatEther(data) : "0",
    refetch,
  };
}

// ─── Read: yield history ──────────────────────────────────────────────────────
export function useYieldHistory(assetId) {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MAUNGRWA_ABI,
    functionName: "getYieldHistory",
    args: [BigInt(assetId)],
    enabled: assetId !== undefined,
  });
  return { history: data || [], isLoading };
}

// ─── Write: mint fractions ────────────────────────────────────────────────────
export function useMintFractions() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const mint = ({ assetId, amount, fractionPrice, protocolFeeBps = 100n }) => {
    const cost    = fractionPrice * BigInt(amount);
    const fee     = (cost * protocolFeeBps) / 10_000n;
    const total   = cost + fee;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MAUNGRWA_ABI,
      functionName: "mintFractions",
      args: [BigInt(assetId), BigInt(amount)],
      value: total,
    });
  };

  return { mint, isPending, isConfirming, isSuccess, hash };
}

// ─── Write: claim yield ───────────────────────────────────────────────────────
export function useClaimYield() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = (assetId) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MAUNGRWA_ABI,
      functionName: "claimYield",
      args: [BigInt(assetId)],
    });
  };

  return { claim, isPending, isConfirming, isSuccess, hash };
}
