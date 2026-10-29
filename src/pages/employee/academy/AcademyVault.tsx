import { useAcademyBase } from "@/hooks/useAcademyBase";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PracticeRecordingVaultPage } from "@/components/training/PracticeRecordingVaultPage";

export default function AcademyVault() {
  const base = useAcademyBase();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to={base} className="inline-flex items-center gap-1 text-[12px] text-white/55 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Training</Link>
      <h1 className="text-2xl font-bold text-white">Recording Vault</h1>
      <PracticeRecordingVaultPage />
    </div>
  );
}
