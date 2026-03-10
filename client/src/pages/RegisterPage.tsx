import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, name, workspaceName });
      toast.success("ההרשמה הצליחה! ברוכים הבאים!");
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message || "שגיאה בהרשמה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-surface-secondary flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-xl shadow-card p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-primary text-2xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            יצירת חשבון חדש
          </h1>
          <p className="text-text-secondary mt-1">
            {step === 1 ? "פרטים אישיים" : "סביבת עבודה"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1
                ? "bg-primary text-white"
                : "bg-surface-tertiary text-text-tertiary"
            }`}
          >
            1
          </div>
          <div
            className={`w-12 h-0.5 ${step >= 2 ? "bg-primary" : "bg-surface-tertiary"}`}
          />
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2
                ? "bg-primary text-white"
                : "bg-surface-tertiary text-text-tertiary"
            }`}
          >
            2
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  שם מלא
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="הזינו את שמכם"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  אימייל
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="your@email.com"
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  סיסמה
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="לפחות 6 תווים"
                  minLength={6}
                  required
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors"
              >
                המשך
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  שם העסק / סביבת העבודה
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  placeholder="למשל: חברת אלפא"
                  required
                />
              </div>
              <p className="text-xs text-text-tertiary">
                זו תהיה סביבת העבודה שלכם ב-CRM. תוכלו להזמין חברי צוות בהמשך.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 bg-surface-tertiary hover:bg-border text-text-secondary font-semibold rounded-lg transition-colors"
                >
                  חזרה
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "יוצר..." : "צור חשבון"}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          כבר יש לכם חשבון?{" "}
          <Link
            to="/login"
            className="text-primary font-semibold hover:underline"
          >
            התחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
