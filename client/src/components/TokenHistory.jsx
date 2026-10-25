import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function TokenHistory() {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const result = await api(`/queue/history?page=${page}`);

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [page, refresh]);

  return (
    <section className="token-history" aria-label="My token history">
      <h2>My token history</h2>
      <p>Your completed, cancelled and skipped tokens appear here.</p>

      <button
        type="button"
        className="text-button"
        onClick={() => setRefresh((value) => value + 1)}
        disabled={loading}
      >
        Refresh history
      </button>

      {loading ? (
        <p role="status">Loading history...</p>
      ) : error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : data ? (
        <>
          {data.tokens.length === 0 ? (
            <p>No tokens on this page yet.</p>
          ) : (
            <ul className="history-list">
              {data.tokens.map((token) => (
                <li key={token.id} className="history-item">
                  <div>
                    <strong>{token.label}</strong>
                    <span>{token.serviceDate}</span>
                  </div>
                  <span className="history-status">{token.status}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="history-pagination">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {Math.max(1, data.totalPages)}
            </span>

            <button
              type="button"
              disabled={page >= data.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}