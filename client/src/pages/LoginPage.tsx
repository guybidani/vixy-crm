import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import GoogleLoginButton from "../components/shared/GoogleLoginButton";

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
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
      <div className="bg-white rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-[#E6E9EF] p-8 w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0073EA] to-[#0060C2] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-[0_4px_16px_rgba(0,115,234,0.3)]">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold text-[#323338]">
            ברוכים הבאים ל-Vixy CRM
          </h1>
          <p className="text-[#676879] mt-1">התחברו לחשבון שלכם</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-[13px] font-medium text-[#323338] mb-1">
              אימייל
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#D0D4E4] rounded-[4px] text-[#323338] placeholder:text-[#9699A6] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] focus-visible:ring-2 focus-visible:ring-[#0073EA] transition-all"
              placeholder="your@email.com"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[13px] font-medium text-[#323338] mb-1">
              סיסמה
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#D0D4E4] rounded-[4px] text-[#323338] placeholder:text-[#9699A6] bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0073EA]/20 focus:border-[#0073EA] focus-visible:ring-2 focus-visible:ring-[#0073EA] transition-all"
                placeholder="הזינו סיסמה"
                required
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9699A6] hover:text-[#676879] transition-colors"
                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-l from-[#0073EA] to-[#0060C2] hover:from-[#0060C2] hover:to-[#0073EA] text-white font-semibold rounded-xl shadow-sm hover:shadow-[0_4px_16px_rgba(0,115,234,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm inline-flex items-center justify-center gap-2"
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

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#D0D4E4]" />
          <span className="text-xs text-[#9699A6]">או</span>
          <div className="flex-1 h-px bg-[#D0D4E4]" />
        </div>

        {/* Google Sign In */}
        <GoogleLoginButton
          text="signin_with"
          onSuccess={async (idToken) => {
            try {
              await googleLogin(idToken);
              toast.success("התחברת בהצלחה!");
              navigate("/dashboard");
            } catch (err: any) {
              toast.error(err?.message || "שגיאה בהתחברות עם Google");
            }
          }}
          onError={(msg) => toast.error(msg)}
        />

        <p className="text-center text-[#676879] text-[13px] mt-6">
          אין לכם חשבון?{" "}
          <Link
            to="/register"
            className="text-[#0073EA] font-semibold hover:text-[#0060C2] hover:underline transition-colors"
          >
            הרשמה
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link
            to="/"
            className="text-[#9699A6] text-xs hover:text-[#676879] hover:underline transition-colors"
          >
            חזרה לדף הבית
          </Link>
        </p>

        {/* Demo credentials */}
        <div className="mt-6 p-4 bg-gradient-to-l from-[#E8F3FF]/40 to-purple-light/30 rounded-xl border border-[#E8F3FF]/60">
          <p className="text-xs text-[#676879] text-center mb-2.5 font-medium">
            משתמש הדגמה:
          </p>
          <div className="flex gap-2.5 justify-center">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@vixy.co.il");
                setPassword("admin123");
              }}
              className="text-[12px] bg-white px-4 py-2 rounded-[4px] border border-[#D0D4E4] hover:border-[#0073EA] hover:bg-white hover:shadow-sm active:scale-95 transition-all text-[#676879] hover:text-[#0073EA] font-medium cursor-pointer"
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
              className="text-[12px] bg-white px-4 py-2 rounded-[4px] border border-[#D0D4E4] hover:border-[#0073EA] hover:bg-white hover:shadow-sm active:scale-95 transition-all text-[#676879] hover:text-[#0073EA] font-medium cursor-pointer"
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
