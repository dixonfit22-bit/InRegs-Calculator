import { useState } from "react";
import { Header } from "@/components/Header";
import { CalculatorForm } from "@/components/CalculatorForm";
import { StandardsTable } from "@/components/StandardsTable";
import { CommandDashboard } from "@/components/CommandDashboard";
import { MarineProfile } from "@/lib/storage";

type Tab = "calculator" | "standards" | "dashboard";

const CAMO_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
  <rect width='120' height='120' fill='none'/>
  <rect x='0'   y='0'   width='30' height='15' fill='%23c5d5e8' opacity='0.18'/>
  <rect x='50'  y='0'   width='20' height='12' fill='%23b8ccde' opacity='0.14'/>
  <rect x='90'  y='5'   width='30' height='10' fill='%23c5d5e8' opacity='0.12'/>
  <rect x='10'  y='20'  width='25' height='10' fill='%23b8ccde' opacity='0.16'/>
  <rect x='60'  y='18'  width='35' height='12' fill='%23c5d5e8' opacity='0.13'/>
  <rect x='0'   y='35'  width='20' height='15' fill='%23b8ccde' opacity='0.15'/>
  <rect x='35'  y='32'  width='30' height='10' fill='%23c5d5e8' opacity='0.11'/>
  <rect x='80'  y='28'  width='40' height='14' fill='%23b8ccde' opacity='0.14'/>
  <rect x='5'   y='52'  width='35' height='12' fill='%23c5d5e8' opacity='0.13'/>
  <rect x='55'  y='48'  width='25' height='15' fill='%23b8ccde' opacity='0.16'/>
  <rect x='95'  y='50'  width='25' height='10' fill='%23c5d5e8' opacity='0.12'/>
  <rect x='15'  y='68'  width='30' height='12' fill='%23b8ccde' opacity='0.14'/>
  <rect x='60'  y='65'  width='40' height='10' fill='%23c5d5e8' opacity='0.13'/>
  <rect x='0'   y='82'  width='25' height='15' fill='%23b8ccde' opacity='0.15'/>
  <rect x='40'  y='80'  width='20' height='12' fill='%23c5d5e8' opacity='0.12'/>
  <rect x='75'  y='78'  width='45' height='14' fill='%23b8ccde' opacity='0.14'/>
  <rect x='10'  y='98'  width='35' height='12' fill='%23c5d5e8' opacity='0.13'/>
  <rect x='60'  y='95'  width='30' height='15' fill='%23b8ccde' opacity='0.15'/>
  <rect x='100' y='100' width='20' height='20' fill='%23c5d5e8' opacity='0.11'/>
</svg>`;

const camoBg = `url("data:image/svg+xml,${CAMO_SVG.trim()}")`;

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");
  const [profileToLoad, setProfileToLoad] = useState<MarineProfile | null>(null);

  const handleEdit = (profile: MarineProfile) => {
    setProfileToLoad(profile);
    setActiveTab("calculator");
  };

  return (
    <div
      className="flex flex-col min-h-[100dvh]"
      style={{
        backgroundColor: "#e8eef5",
        backgroundImage: camoBg,
        backgroundSize: "120px 120px",
      }}
    >
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-5 flex flex-col gap-5">
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
