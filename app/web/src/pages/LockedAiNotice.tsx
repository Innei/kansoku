import { Lock } from "lucide-react";
import { navigate } from "../router";

export function LockedAiNotice({
  message = "AI 功能需要有效授权才能使用",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`locked-ai-notice${className ? ` ${className}` : ""}`}>
      <Lock className="icon" size={14} />
      <span>{message}</span>
      <button
        type="button"
        className="locked-ai-notice-cta"
        onClick={() => navigate("/settings#license-section")}
      >
        订阅解锁
      </button>
    </div>
  );
}
