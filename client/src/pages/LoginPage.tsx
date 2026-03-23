import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("התחברת בהצלחה!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  }

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
            ברוכים הבאים ל-Vixy CRM
          </h1>
          <p className="text-text-secondary mt-1">התחברו לחשבון שלכם</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-text-primary mb-1">
              אימייל
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-border-light rounded-xl text-text-primary placeholder:text-text-tertiary bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-all"
              placeholder="your@email.com"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-text-primary mb-1">
              סיסמה
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-border-light rounded-xl text-text-primary placeholder:text-text-tertiary bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-all"
                placeholder="הזינו סיסמה"
                required
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-l from-primary to-primary-dark hover:from-primary-hover hover:to-primary text-white font-semibold rounded-xl shadow-sm hover:shadow-card-glow hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                מתחבר...
              </>
            ) : (
              "התחברות"
            )}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          אין לכם חשבון?{" "}
          <Link
            to="/register"
            className="text-primary font-semibold hover:text-primary-dark hover:underline transition-colors"
          >
            הרשמה
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

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-gradient-to-l from-primary-light/40 to-purple-light/30 rounded-xl border border-primary-light/60">
          <p className="text-xs text-text-secondary text-center mb-2.5 font-medium">
            משתמש הדגמה:
          </p>
          <div className="flex gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@vixy.co.il");
                setPassword("admin123");
              }}
              className="text-xs bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-border-light hover:border-primary hover:bg-white hover:shadow-sm active:scale-95 transition-all text-text-secondary hover:text-primary font-medium cursor-pointer"
              aria-label="מלא פרטי כניסה של מנהל הדגמה"
            >
              מנהל
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("agent@vixy.co.il");
                setPassword("agent123");
              }}
              className="text-xs bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-border-light hover:border-primary hover:bg-white hover:shadow-sm active:scale-95 transition-all text-text-secondary hover:text-primary font-medium cursor-pointer"
              aria-label="מלא פרטי כניסה של נציג הדגמה"
            >
              נציג
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
