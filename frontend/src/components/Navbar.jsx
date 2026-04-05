export default function Navbar({ tab, setTab, address, isConnected, onConnect }) {
  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <nav className="nav">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="10,2 18,7 18,13 10,18 2,13 2,7" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
            <circle cx="10" cy="10" r="2.5" fill="#C9A84C"/>
          </svg>
        </div>
        <div className="logo-text">Maung<span>RWA</span></div>
      </div>

      <div className="nav-pills">
        {["market", "portfolio", "yields"].map(t => (
          <button
            key={t}
            className={`pill ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <button className="wallet-btn" onClick={onConnect}>
        {isConnected ? `⬡ ${shortAddr}` : "Connect Wallet"}
      </button>
    </nav>
  );
}
