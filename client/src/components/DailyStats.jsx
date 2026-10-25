import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function DailyStats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function loadStats() {
      try {
        const result = await api("/queue/stats");

        if (!cancelled) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not update daily summary.");
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(loadStats, 5000);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <section className="daily-summary" aria-label="Daily summary">
      <h2>Today's summary</h2>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {data ? (
        <>
          <p className="queue-note">
            {data.serviceDate} · Updates every 5 seconds
          </p>

          <div className="queue-stats">
            <div>
              <span>Tokens issued</span>
              <strong>{data.totalIssued}</strong>
            </div>

            <div>
              <span>Completed</span>
              <strong>{data.counts.Completed}</strong>
            </div>

            <div>
              <span>Cancelled</span>
              <strong>{data.counts.Cancelled}</strong>
            </div>

            <div>
              <span>Skipped</span>
              <strong>{data.counts.Skipped}</strong>
            </div>
          </div>
        </>
      ) : (
        !error && <p role="status">Loading daily summary...</p>
      )}
    </section>
  );
}