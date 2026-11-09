"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getPasswordStrength() {
    if (password.length === 0) {
      return "";
    }

    if (password.length < 6) {
      return "Weak";
    }

    if (password.length < 10) {
      return "Medium";
    }

    return "Strong";
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      setError("Enter your number in international format, for example +27821234567.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      phone: phone.trim(),
      password,
      options: { channel: "sms" },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setOtpSent(true);
    setMessage(`We sent a verification code to ${phone.trim()}.`);

    setLoading(false);
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: otp.trim(), type: "sms" });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/messages");
    router.refresh();
  }

  async function resendOtp() {
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "sms", phone: phone.trim() });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage(`A new code was sent to ${phone.trim()}.`);
  }

  const passwordStrength = getPasswordStrength();

  return (
    <main className="auth-page">
      <div className="auth-card">
        <header className="auth-heading">
          <Link href="/login" className="auth-heading-link">Log in</Link>
          <div className="auth-heading-brand"><span className="auth-logo" aria-hidden="true">💬</span><h1>{otpSent ? "Verify your number" : "Create account"}</h1></div>
          <span className="auth-heading-note">WhatsApp Clone</span>
        </header>
        <div className="auth-content">
        <p className="auth-subtitle">{otpSent ? `Enter the SMS code sent to ${phone}.` : "Sign up with your phone number and verify it by SMS."}</p>

        {otpSent ? <form onSubmit={handleVerifyOtp} className="auth-form">
          <div className="form-group">
            <label htmlFor="otp">Verification code</label>
            <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter SMS code" value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))} required />
          </div>
          {error && <div className="auth-message auth-error" role="alert">{error}</div>}
          {message && <div className="auth-message auth-success" role="status">{message}</div>}
          <button type="submit" className="auth-submit" disabled={loading || !otp.trim()}>{loading ? "Verifying…" : "Verify number"}</button>
          <button type="button" className="auth-resend" onClick={() => void resendOtp()} disabled={loading}>{loading ? "Sending…" : "Resend code"}</button>
        </form> : <form onSubmit={handleSignup} className="auth-form">

          <div className="form-group">
            <label htmlFor="phone">Mobile number</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+27821234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
            <small className="auth-field-hint">Use international format with country code.</small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className={`strength-fill ${passwordStrength.toLowerCase()}`}
                  />
                </div>

                <span>
                  Password strength: {passwordStrength}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm password
            </label>

            <div className="password-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-message auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message auth-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>}

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href="/login">Log in</Link>
        </p>
        </div>
      </div>
    </main>
  );
}
