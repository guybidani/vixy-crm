import { useState, useCallback } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAiHealth, scoreDeal } from "../../api/ai";

interface AiDealScoreProps {
  dealId: string;
}

export default function AiDealScore({ dealId }: AiDealScoreProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);

  const { data: health } = useQuery({
    queryKey: ["ai-health"],
    queryFn: getAiHealth,
    staleTime: 60_000,
    retry: false,
  });

  const isAvailable = health?.available ?? false;

  const handleScore = useCallback(() => {
    if (loading || !isAvailable) return;

    setLoading(true);
    setResult("");
    setError("");
    setShowResult(true);

    scoreDeal(dealId, {
      onChunk: (text) => setResult((prev) => prev + text),
      onDone: () => setLoading(false),
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
    });
  }, [dealId, loading, isAvailable]);

  if (!isAvailable) return null;

  return (
    <div className="relative">
      <button
        onClick={handleScore}
        disabled={loading}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#6C5CE7] hover:bg-[#F8F7FF] rounded transition-colors disabled:opacity-50"
        title="ציון AI לעסקה"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} />
        )}
        ציון AI
      </button>

      {showResult && (result || error) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[#E6E9EF] p-3 z-30 min-w-[220px]">
          <button
            onClick={() => {
              setShowResult(false);
              setResult("");
              setError("");
            }}
            className="absolute top-1.5 left-1.5 p-0.5 rounded-full hover:bg-[#F5F6F8] text-[#9699A6]"
          >
            <X size={10} />
          </button>
          {error ? (
            <p className="text-[11px] text-[#E44258]">{error}</p>
          ) : (
            <div className="text-[11px] text-[#323338] whitespace-pre-wrap leading-relaxed" dir="rtl">
              {result}
              {loading && (
                <span className="inline-block w-1 h-3 bg-[#6C5CE7] rounded-sm animate-pulse mr-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
