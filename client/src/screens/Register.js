import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArchiveBoxIcon, ArrowRightIcon, EyeIcon, EyeSlashIcon, ReceiptPercentIcon, UsersIcon } from "@heroicons/react/24/outline";
import validator from "validator";
import { userRegistration } from "../store/registerAction";

const inputStyle = "w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60";

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const registerState = useSelector((state) => state.register);
  const disabled = registerState.loading || registerState.registerSuccess;
  const formError = error || (registerState.registerFails ? registerState.error : "");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (disabled) return;
    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter your first and last name.");
      return;
    }
    if (!validator.isEmail(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setError("");
    dispatch(userRegistration({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password }));
  };

  useEffect(() => {
    if (!registerState.registerSuccess) return;
    const timeout = setTimeout(() => navigate("/login", { replace: true }), 2000);
    return () => clearTimeout(timeout);
  }, [registerState.registerSuccess, navigate]);

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
            A fresh start<br />for your store.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-slate-500">
            Bring your inventory, sales, and customer details together in one place.
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

        <section aria-labelledby="register-heading" className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Get started</p>
            <h2 id="register-heading" className="mt-2 text-2xl font-semibold tracking-tight">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Enter your details to join your store's workspace.</p>
          </div>

          <form onSubmit={handleSubmit} aria-busy={registerState.loading} className="space-y-5 p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { id: "first-name", name: "firstName", label: "First name", autoComplete: "given-name", value: firstName, setter: setFirstName },
                { id: "last-name", name: "lastName", label: "Last name", autoComplete: "family-name", value: lastName, setter: setLastName },
              ].map((field) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</label>
                  <input id={field.id} name={field.name} type="text" autoComplete={field.autoComplete} required disabled={disabled} value={field.value}
                    onChange={(event) => { field.setter(event.target.value); setError(""); }}
                    aria-describedby={formError ? "register-error" : undefined}
                    className={inputStyle} placeholder={field.label} />
                </div>
              ))}
            </div>
            <div>
              <label htmlFor="email-address" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input id="email-address" name="email" type="email" autoComplete="email" required disabled={disabled} value={email}
                onChange={(event) => { setEmail(event.target.value); setError(""); }}
                aria-describedby={formError ? "register-error" : undefined}
                className={inputStyle} placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required disabled={disabled} value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(""); }}
                  aria-describedby={formError ? "password-help register-error" : "password-help"}
                  className={`${inputStyle} pr-12`} placeholder="Create a password" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-controls="password" aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-400 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
              <p id="password-help" className="mt-2 text-xs text-slate-500">Use at least 6 characters.</p>
            </div>

            {formError && <p id="register-error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{formError}</p>}
            {registerState.registerSuccess && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">Account created. Taking you to sign in...</p>}

            <button type="submit" disabled={disabled}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-60">
              {registerState.loading ? (
                <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" aria-hidden="true" />Creating account...</>
              ) : registerState.registerSuccess ? "Account created" : (
                <>Create account <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></>
              )}
            </button>
          </form>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-500 sm:px-8">
            Already have an account? <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Sign in <span aria-hidden="true">&rarr;</span></Link>
          </div>
        </section>
      </div>
      <footer className="px-5 pb-6 text-center text-xs text-slate-400">Inventory, sales, and customers. All connected.</footer>
    </main>
  );
};

export default Register;
