import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

type PasswordStrength = "none" | "weak" | "medium" | "strong";

function getPasswordStrength(pw: string): PasswordStrength {
  if (pw.length === 0) return "none";
  if (pw.length < 8) return "weak";
  const hasLetters = /[a-zA-Z\u0590-\u05FF]/.test(pw);
  const hasNumbers = /\d/.test(pw);
  const hasSpecial = /[^a-zA-Z\u0590-\u05FF\d\s]/.test(pw);
  if (hasLetters && hasNumbers && hasSpecial) return "strong";
  if (hasLetters || hasNumbers) return "medium";
  return "weak";
}

const strengthConfig: Record<
  Exclude<PasswordStrength, "none">,
  { label: string; color: string; width: string }
> = {
  weak: { label: "חלשה", color: "bg-danger", width: "33%" },
  medium: { label: "בינונית", color: "bg-warning", width: "66%" },
  strong: { label: "חזקה", color: "bg-success", width: "100%" },
};

function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0590-\u05FF-]/g, "")
    .slice(0, 40);
}

function suggestWorkspaceName(userName: string): string {
  const firstName = userName.trim().split(/\s+/)[0];
  if (!firstName) return "";
  return `החברה של ${firstName}`;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">(
    "forward"
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const slug = useMemo(() => generateSlug(workspaceName), [workspaceName]);

  // Auto-suggest workspace name when entering step 2
  useEffect(() => {
    if (step === 2 && !workspaceName && name) {
      setWorkspaceName(suggestWorkspaceName(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function goToStep(target: number) {
    setStepDirection(target > step ? "forward" : "back");
    setStep(target);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      goToStep(2);
      return;
    }
    setLoading(true);
    try {
      await register({ email, password, name, workspaceName });
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "שגיאה בהרשמה";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // Success screen
  if (showSuccess) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-[#f0f0ff] via-[#f5f6f8] to-[#e8e8ff] flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card-hover border border-white/60 p-12 w-full max-w-md animate-fade-in-up text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-success to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-card-glow animate-scale-check">
            <Check className="text-white" size={40} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            ברוכים הבאים!
          </h1>
          <p className="text-text-secondary">מעביר אתכם למערכת...</p>
          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-border-light rounded-xl text-text-primary placeholder:text-text-tertiary bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-all";

  const stepAnimation =
    stepDirection === "forward"
      ? "animate-slide-in-right"
      : "animate-slide-in-left";

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#f0f0ff] via-[#f5f6f8] to-[#e8e8ff] flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-card-hover border border-white/60 p-8 w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-card-glow">
            <span className="text-white text-2xl font-bold">V</span>
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
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step >= 1
                ? "bg-gradient-to-br from-primary to-primary-dark text-white shadow-sm"
                : "bg-surface-tertiary text-text-tertiary"
            }`}
          >
            {step > 1 ? <Check size={14} strokeWidth={3} /> : "1"}
          </div>
          <div className="w-16 h-1 rounded-full bg-surface-tertiary overflow-hidden">
            <div
              className={`h-full bg-gradient-to-l from-primary to-primary-dark rounded-full transition-all duration-500 ease-out ${
                step >= 2 ? "w-full" : "w-0"
              }`}
            />
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              step >= 2
                ? "bg-gradient-to-br from-primary to-primary-dark text-white shadow-sm"
                : "bg-surface-tertiary text-text-tertiary"
            }`}
          >
            2
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <div key="step1" className={stepAnimation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
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
                    className={inputClass}
                    placeholder="your@email.com"
                    required
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    סיסמה
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="לפחות 8 תווים"
                      minLength={8}
                      required
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                      aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {passwordStrength !== "none" && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-surface-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${strengthConfig[passwordStrength].color}`}
                          style={{
                            width: strengthConfig[passwordStrength].width,
                          }}
                        />
                      </div>
                      <p
                        className={`text-xs mt-1 font-medium ${
                          passwordStrength === "weak"
                            ? "text-danger"
                            : passwordStrength === "medium"
                              ? "text-warning"
                              : "text-success"
                        }`}
                      >
                        סיסמה {strengthConfig[passwordStrength].label}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-l from-primary to-primary-dark hover:from-primary-hover hover:to-primary text-white font-semibold rounded-xl shadow-sm hover:shadow-card-glow hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                >
                  המשך
                </button>
              </div>
            </div>
          ) : (
            <div key="step2" className={stepAnimation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    שם העסק / סביבת העבודה
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className={inputClass}
                    placeholder="למשל: חברת אלפא"
                    required
                  />
                  {slug && (
                    <p className="text-xs text-text-tertiary mt-1.5 font-mono" dir="ltr" style={{ textAlign: "left" }}>
                      {slug}
                    </p>
                  )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  זה יהיה שם הסביבה שלכם. תוכלו להזמין חברי צוות בהמשך.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="flex-1 py-2.5 bg-white/60 hover:bg-white border border-border-light text-text-secondary font-semibold rounded-xl transition-all duration-200 hover:shadow-sm"
                  >
                    חזרה
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-gradient-to-l from-primary to-primary-dark hover:from-primary-hover hover:to-primary text-white font-semibold rounded-xl shadow-sm hover:shadow-card-glow hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm inline-flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        יוצר...
                      </>
                    ) : (
                      "צור חשבון"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          כבר יש לכם חשבון?{" "}
          <Link
            to="/login"
            className="text-primary font-semibold hover:text-primary-dark hover:underline transition-colors"
          >
            התחברות
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link
            to="/"
            className="text-text-tertiary text-xs hover:text-text-secondary hover:underline transition-colors"
          >
            חזרה לדף הבית
          </Link>
        </p>
      </div>
    </div>
  );
}
