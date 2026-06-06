import { useState } from "react";
import { Header } from "@/components/Header";
import { CalculatorForm } from "@/components/CalculatorForm";
import { StandardsTable } from "@/components/StandardsTable";
import { CommandDashboard } from "@/components/CommandDashboard";
import { MarineProfile } from "@/lib/storage";

type Tab = "calculator" | "standards" | "dashboard";

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");
  const [profileToLoad, setProfileToLoad] = useState<MarineProfile | null>(null);

  const handleEdit = (profile: MarineProfile) => {
    setProfileToLoad(profile);
    setActiveTab("calculator");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col gap-6">
        {activeTab === "calculator" ? (
          <CalculatorForm
            profileToLoad={profileToLoad}
            onProfileLoaded={() => setProfileToLoad(null)}
          />
        ) : activeTab === "standards" ? (
          <StandardsTable />
        ) : (
          <CommandDashboard onEdit={handleEdit} />
        )}
      </main>
    </div>
  );
}
