import { ArrowLeft } from "lucide-react";
import { navigate } from "../router";
import { LockedAiNotice } from "./LockedAiNotice";

export function LicenseLockedPage() {
  return (
    <div className="page license-locked-page">
      <LockedAiNotice message="此功能需要有效授权，订阅后即可解锁" />
      <a
        className="settings-back-link"
        href="/"
        onClick={(event) => {
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate("/");
        }}
      >
        <ArrowLeft className="icon" size={13} /> 返回
      </a>
    </div>
  );
}
