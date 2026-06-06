import { Header } from "@/components/Header";
import { CalculatorForm } from "@/components/CalculatorForm";

export default function Calculator() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <Header />
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col gap-6">
        <CalculatorForm />
      </main>
    </div>
  );
}
