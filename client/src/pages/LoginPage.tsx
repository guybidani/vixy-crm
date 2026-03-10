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
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message || "שגיאה בהתחברות");
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
            ברוכים הבאים ל-Vixy CRM
          </h1>
          <p className="text-text-secondary mt-1">התחברו לחשבון שלכם</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-colors"
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
                className="w-full px-4 py-2.5 border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary transition-colors"
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
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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
            className="text-primary font-semibold hover:underline"
          >
            הרשמה
          </Link>
        </p>

        {/* Demo credentials */}
        <div className="mt-6 p-3 bg-surface-secondary rounded-lg">
          <p className="text-xs text-text-tertiary text-center mb-2">
            משתמש הדגמה:
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@vixy.co.il");
                setPassword("admin123");
              }}
              className="text-xs bg-white px-3 py-1.5 rounded border border-border hover:border-primary transition-colors text-text-secondary cursor-pointer"
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
              className="text-xs bg-white px-3 py-1.5 rounded border border-border hover:border-primary transition-colors text-text-secondary cursor-pointer"
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
