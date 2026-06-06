import { useState } from "react";
import { Header } from "@/components/Header";
import { CalculatorForm } from "@/components/CalculatorForm";
import { StandardsTable } from "@/components/StandardsTable";

type Tab = "calculator" | "standards";

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col gap-6">
        {activeTab === "calculator" ? <CalculatorForm /> : <StandardsTable />}
      </main>
    </div>
  );
}
