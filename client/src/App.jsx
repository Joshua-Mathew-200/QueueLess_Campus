import QueuePanel from "./components/QueuePanel";
import { useEffect, useState } from "react";
import { api } from "./services/api";
import "./App.css";
import TokenHistory from "./components/TokenHistory";
import DailyStats from "./components/DailyStats";
function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function checkSession() {
    setChecking(true);
    setError("");

    try {
      const data = await api("/auth/me");
      setUser(data.user);
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
      } else {
        setError("Cannot reach the server. Please retry.");
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        });

        setMode("login");
        setPassword("");
        setMessage("Account created. You can now log in.");
      } else {
        const data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        setUser(data.user);
        setPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");

    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setPassword("");
      setMessage("You have logged out.");
    } catch {
      setError("Logout failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setMessage("");
    setPassword("");
  }

  return (
    <main className="app-shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">Q</span>
        <span>QueueLess Campus</span>
      </header>

      <section className="auth-card">
        {checking ? (
          <p role="status">Checking your session...</p>
        ) : user ? (
          <>
            <p className="eyebrow">YOUR CAMPUS ACCOUNT</p>
            <h1>Welcome, {user.name}</h1>
            <p>You are logged in as a {user.role}.</p>
            <QueuePanel key={user.id} user={user} />
            {user.role === "staff" && <DailyStats key={user.id} />}
            {user.role === "student" && <TokenHistory key={user.id} />}
            <button disabled={busy} onClick={handleLogout}>
              {busy ? "Logging out..." : "Log out"}
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">LESS WAITING. MORE CAMPUS.</p>
            <h1>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p>
              {mode === "login"
                ? "Log in to access your campus queue."
                : "Register as a student to get started."}
            </p>

            <form onSubmit={handleSubmit}>
              <fieldset disabled={busy}>
                {mode === "register" && (
                  <label>
                    Full name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      maxLength={100}
                      required
                    />
                  </label>
                )}

                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    maxLength={254}
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "register" ? 8 : undefined}
                    required
                  />
                </label>

                <button type="submit">
                  {busy
                    ? "Please wait..."
                    : mode === "login"
                      ? "Log in"
                      : "Create account"}
                </button>
              </fieldset>
            </form>

            <button
              className="text-button"
              onClick={switchMode}
              disabled={busy}
            >
              {mode === "login"
                ? "New here? Create an account"
                : "Already registered? Log in"}
            </button>
          </>
        )}

        {message && <p className="success" role="status">{message}</p>}

        {error && (
          <div role="alert">
            <p className="error">{error}</p>
            {!user && (
              <button
                className="text-button"
                onClick={checkSession}
                disabled={busy || checking}
              >
                Retry connection
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;