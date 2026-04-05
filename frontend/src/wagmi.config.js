import { createConfig, http } from "wagmi";
import { polygon, polygonAmoy } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// Chain name map — dipakai di UI
export const CHAIN_NAMES = {
  [polygon.id]:     "Polygon Mainnet",
  [polygonAmoy.id]: "Polygon Amoy Testnet",
};

export const config = createConfig({
  chains: [polygonAmoy, polygon],
  connectors: [injected()],
  transports: {
    [polygonAmoy.id]: http(import.meta.env.VITE_AMOY_RPC || "https://rpc-amoy.polygon.technology"),
    [polygon.id]:     http(import.meta.env.VITE_POLYGON_RPC || "https://polygon-rpc.com"),
  },
});