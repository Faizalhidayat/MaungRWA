import { useState, useCallback, useRef } from "react";

/**
 * useToast — simple toast notification hook
 *
 * Cara pakai:
 *   const { toast, ToastContainer } = useToast();
 *   toast("Berhasil mint fractions!");
 *   toast("Error!", "error");
 *
 * Render <ToastContainer /> sekali di App.jsx
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timerRef = useRef({});

  const toast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, visible: true }]);

    timerRef.current[id] = setTimeout(() => {
      // Fade out
      setToasts(prev =>
        prev.map(t => t.id === id ? { ...t, visible: false } : t)
      );
      // Remove after animation
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        delete timerRef.current[id];
      }, 300);
    }, duration);
  }, []);

  const ToastContainer = () => (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      zIndex: 9999,
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: t.type === "error"   ? "#D85A30"
                      : t.type === "success" ? "#1D9E75"
                      : "#0D0D0D",
            color: "#fff",
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            padding: "10px 18px",
            borderRadius: 8,
            maxWidth: 320,
            opacity: t.visible ? 1 : 0,
            transform: t.visible ? "translateY(0)" : "translateY(16px)",
            transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );

  return { toast, ToastContainer };
}
