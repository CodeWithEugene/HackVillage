import type { Metadata } from "next";

import { HowItWorks } from "@/components/patterns/how-it-works";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "From first idea to final payday: the prize is locked in first, builders team up, every project is judged the same way, and winners are paid instantly.",
};

export default function HowItWorksPage() {
  return (
    <div className="pt-8 font-display">
      <HowItWorks headingLevel="h1" />
    </div>
  );
}
