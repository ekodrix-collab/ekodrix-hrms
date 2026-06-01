"use client";

export function PrintButtons() {
    return (
        <div
            style={{
                position: "fixed",
                top: 16,
                right: 16,
                display: "flex",
                gap: 8,
                zIndex: 1000,
            }}
            className="no-print-bar"
        >
            <button
                className="btn-print"
                onClick={() => window.print()}
                style={{
                    background: "#4338ca",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 20px",
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                    fontFamily: "inherit",
                }}
            >
                🖨 Print / Save PDF
            </button>
            <button
                className="btn-close"
                onClick={() => window.close()}
                style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 20px",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                }}
            >
                ✕ Close
            </button>
        </div>
    );
}
