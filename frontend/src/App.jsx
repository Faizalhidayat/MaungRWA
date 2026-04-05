import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import Navbar       from "./components/Navbar";
import MarketTab    from "./components/MarketTab";
import PortfolioTab from "./components/PortfolioTab";
import YieldsTab    from "./components/YieldsTab";
import { useToast } from "./hooks/useToast";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState("market");
  const { address, isConnected } = useAccount();
  const { connect }    = useConnect();
  const { disconnect } = useDisconnect();
  const { toast, ToastContainer } = useToast();

  const handleConnect = () => {
    if (isConnected) { disconnect(); toast("Wallet disconnected"); }
    else connect({ connector: injected() }, {
      onSuccess: () => toast("Wallet connected!", "success"),
      onError:   (e) => toast(`Failed: ${e.message}`, "error"),
    });
  };

  return (
    <div className="app">
      <Navbar tab={tab} setTab={setTab} address={address} isConnected={isConnected} onConnect={handleConnect} />
      {tab === "market"    && <MarketTab />}
      {tab === "portfolio" && <PortfolioTab address={address} />}
      {tab === "yields"    && <YieldsTab address={address} />}
      <ToastContainer />
    </div>
  );
}
