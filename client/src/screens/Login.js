import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArchiveBoxIcon, ArrowRightIcon, EyeIcon, EyeSlashIcon, ReceiptPercentIcon, UsersIcon } from "@heroicons/react/24/outline";
import validator from "validator";
import { userLogin } from "../store/userAction";

const inputStyle = "w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const loginState = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loginState.loading) return;
    const normalizedEmail = email.trim();
    if (!validator.isEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setError("");
    dispatch(userLogin({ email: normalizedEmail, password }));
  };

  useEffect(() => {
    if (loginState.loginSuccess) {
      const from = location.state?.from;
      const destination = from
        ? `${from.pathname || "/"}${from.search || ""}${from.hash || ""}`
        : "/";
      navigate(destination, { replace: true });
    }
  }, [loginState.loginSuccess, location, navigate]);

  const formError = error || (loginState.loginFails ? loginState.error : "");

  return (
    <main className="flex min-h-screen flex-col bg-gray-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-5 sm:px-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <ArchiveBoxIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Inventory & sales</p>
            <p className="mt-0.5 text-xs text-slate-500">Your store, in one place</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-20">
        <section className="hidden lg:block" aria-labelledby="workspace-heading">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Your daily workspace</p>
          <h1 id="workspace-heading" className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Keep your store<br />moving forward.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-slate-500">
            From the first restock to the last sale, keep track of the details that matter.
          </p>
          <div className="mt-9 space-y-3">
            {[
              { icon: ArchiveBoxIcon, title: "Stay on top of stock", detail: "Review inventory and record every restock." },
              { icon: ReceiptPercentIcon, title: "Make every sale count", detail: "Create bills and revisit your sales history." },
              { icon: UsersIcon, title: "Know your customers", detail: "Keep customer details and purchases together." },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="login-heading" className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Welcome back</p>
            <h2 id="login-heading" className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your store</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Enter your account details to get started.</p>
          </div>

          <form id="login-form" name="login" action="/api/user/login" method="post" autoComplete="on" onSubmit={handleSubmit} aria-busy={loginState.loading} className="space-y-5 p-6 sm:p-8">
            <div>
              <label htmlFor="email-address" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError(""); }}
                aria-describedby={formError ? "login-error" : undefined}
                className={inputStyle}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(""); }}
                  aria-describedby={formError ? "login-error" : undefined}
                  className={`${inputStyle} pr-12`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="password"
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-400 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {formError && <p id="login-error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{formError}</p>}

            <button
              type="submit"
              disabled={loginState.loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60"
            >
              {loginState.loading ? (
                <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" aria-hidden="true" />Signing in...</>
              ) : (
                <>Sign in <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></>
              )}
            </button>
          </form>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-500 sm:px-8">
            New here? <Link to="/register" className="font-semibold text-emerald-700 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Create an account <span aria-hidden="true">&rarr;</span></Link>
          </div>
        </section>
      </div>
      <footer className="px-5 pb-6 text-center text-xs text-slate-400">Inventory, sales, and customers. All connected.</footer>
    </main>
  );
};

export default Login;
