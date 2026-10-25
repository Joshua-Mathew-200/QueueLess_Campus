import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function WaitingList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function loadWaitingList() {
      try {
        const result = await api(`/queue/waiting?page=${page}`);

        if (!cancelled) {
          if (page > Math.max(1, result.totalPages)) {
            setPage(Math.max(1, result.totalPages));
            return;
          }

          setData(result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not update waiting list.");
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(loadWaitingList, 5000);
        }
      }
    }

    loadWaitingList();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page]);

  const currentData = data?.page === page ? data : null;

  return (
    <section className="daily-summary" aria-label="Waiting list">
      <h2>Waiting list</h2>
      <p className="queue-note">
        Students are called in token order. Updates every 5 seconds.
      </p>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {currentData ? (
        <>
          <p>Students waiting: {currentData.total}</p>

          {currentData.tokens.length === 0 ? (
            <p>No students are waiting.</p>
          ) : (
            <ul className="history-list">
              {currentData.tokens.map((token) => (
                <li className="history-item" key={token.id}>
                  <div>
                    <strong>{token.label}</strong>
                    <span>{token.studentName}</span>
                    <span>{token.serviceDate}</span>
                  </div>
                  <span className="history-status">Waiting</span>
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
              Page {page} of {Math.max(1, currentData.totalPages)}
            </span>

            <button
              type="button"
              disabled={page >= currentData.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        !error && <p role="status">Loading waiting list...</p>
      )}
    </section>
  );
}