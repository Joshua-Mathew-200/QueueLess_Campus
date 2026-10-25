import { useEffect, useState } from "react";
import { api } from "../services/api";

function QueuePanel({ user }) {
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function refresh() {
      try {
        const data = await api("/queue/status");

        if (!cancelled) {
          setQueue(data);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Cannot update the queue. Please refresh to retry.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(refresh, 5000);
        }
      }
    }

    refresh();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  async function cancelMyToken() {
  const token = queue?.myToken;
  if (!token) return;

  if (!window.confirm(`Cancel your token ${token.label}?`)) {
    return;
  }

  setBusy(true);
  setError("");
  setMessage("");

  try {
    const result = await api("/queue/cancel", {
      method: "PATCH",
      body: JSON.stringify({ tokenId: token.id }),
    });

    setMessage(result.message);

    setQueue((current) => ({
      ...current,
      myToken:
        current.myToken?.id === token.id
          ? null
          : current.myToken,
      peopleAhead: null,
    }));

    try {
      const updated = await api("/queue/status");
      setQueue(updated);
    } catch {
      setError("Token cancelled. Waiting for updated queue details.");
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setBusy(false);
  }
}
async function joinQueue() {
  setBusy(true);
  setError("");
  setMessage("");

  try {
    const result = await api("/queue/join", {
      method: "POST",
    });

    // Show the issued token immediately.
    setQueue((current) => ({
      ...current,
      myToken: result.token,
      peopleAhead: null,
    }));

    setMessage(
      `You joined the queue. Your token is ${result.token.label}.`
    );

    try {
      const updated = await api("/queue/status");
      setQueue(updated);
    } catch {
      setError(
        "Your token was issued. Queue details will update when the connection returns."
      );
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setBusy(false);
  }
}
async function staffAction(action) {
  const currentToken = queue?.currentToken;

  if (action !== "next" && !currentToken) return;

  if (
    action === "Skipped" &&
    !window.confirm(`Skip absent student ${currentToken.label}?`)
  ) {
    return;
  }

  setBusy(true);
  setError("");
  setMessage("");

  try {
    const result =
      action === "next"
        ? await api("/queue/next", {
            method: "POST",
          })
        : await api("/queue/resolve", {
            method: "PATCH",
            body: JSON.stringify({
              tokenId: currentToken.id,
              status: action,
            }),
          });

    setMessage(result.message);

    // Immediately reflect the successful action.
    setQueue((current) => ({
      ...current,
      currentToken: action === "next" ? result.token : null,
    }));

    try {
      const updated = await api("/queue/status");
      setQueue(updated);
    } catch {
      setError(
        "Action saved. Queue details will update when the connection returns."
      );
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setBusy(false);
  }
}
  async function changeAdmission(isOpen) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await api("/queue/admission", {
        method: "PATCH",
        body: JSON.stringify({ isOpen }),
      });

      setMessage(result.message);

      // Update the counter without waiting for the next refresh.
      setQueue((current) =>
        current
          ? { ...current, counter: result.counter }
          : current
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p role="status">Loading queue...</p>;
  }

  return (
    <section className="queue-panel" aria-label="Campus queue">
      {queue && (
        <>
          <h2>{queue.counter.name}</h2>

          <p>
            Queue: <strong>{queue.counter.isOpen ? "Open" : "Closed"}</strong>
          </p>

          <p>Service date: {queue.counter.serviceDate}</p>

          <div className="queue-stats">
            <div>
              <span>Now serving</span>
              <strong>{queue.currentToken?.label || "—"}</strong>
            </div>

            <div>
              <span>Students waiting</span>
              <strong>{queue.waitingCount}</strong>
            </div>
          </div>

          {user.role === "staff" ? (
            <div className="queue-actions">
              <button
                disabled={busy || Boolean(error)}
                onClick={() => changeAdmission(!queue.counter.isOpen)}
              >
                {busy
                  ? "Updating..."
                  : queue.counter.isOpen
                    ? "Close Queue"
                    : "Open Queue"}
              </button>

              <p className="queue-note">
                Closing the queue stops new entries. Existing tokens remain.
              </p>
              <div className="staff-controls">
  <button
    onClick={() => staffAction("next")}
    disabled={
      busy ||
      Boolean(error) ||
      Boolean(queue.currentToken) ||
      queue.waitingCount === 0
    }
  >
    Call Next
  </button>

  {queue.currentToken && (
    <>
      <p>
        Serving: <strong>{queue.currentToken.label}</strong>
      </p>

      <button
        onClick={() => staffAction("Completed")}
        disabled={busy || Boolean(error)}
      >
        Complete Service
      </button>

      <button
        className="text-button"
        onClick={() => staffAction("Skipped")}
        disabled={busy || Boolean(error)}
      >
        Skip Student
      </button>
    </>
  )}
</div>
            </div>
          ) : (
            <div className="student-queue">
  {queue.myToken ? (
    <>
      <p className="eyebrow">YOUR TOKEN</p>
      <h2 className="token-number">{queue.myToken.label}</h2>

      <p>
        Status: <strong>{queue.myToken.status}</strong>
      </p>

      <p>
        People ahead:{" "}
        <strong>{queue.peopleAhead ?? "Updating..."}</strong>
      </p>

      {queue.myToken.status === "Called" ? (
        <p role="status">
          It’s your turn! Please go to the counter.
        </p>
      ) : (
        <p>Your position updates automatically.</p>
      )}
      {queue.myToken.status === "Waiting" && (
  <button
    className="text-button"
    onClick={cancelMyToken}
    disabled={busy || Boolean(error)}
  >
    {busy ? "Cancelling..." : "Cancel Token"}
  </button>
)}
    </>
  ) : (
    <>
      <p>
        {queue.counter.isOpen
          ? "Join the queue to receive your token."
          : "The queue is currently closed."}
      </p>

      <button
        onClick={joinQueue}
        disabled={
          busy ||
          !queue.counter.isOpen ||
          Boolean(error)
        }
      >
        {busy ? "Joining..." : "Join Queue"}
      </button>
    </>
  )}
</div>
          )}
        </>
      )}

      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}

export default QueuePanel;