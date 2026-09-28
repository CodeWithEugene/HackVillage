import { TrustStats, type TrustStat } from "@/components/landing/trust-stats";

const STATS: TrustStat[] = [
  {
    value: "100%",
    label: "of every prize pool escrowed before launch",
    href: "/how-escrow-works",
    link: "How escrow works",
  },
  {
    value: "50%",
    label: "paid the moment winners are announced",
    href: "/blog/how-winners-get-paid",
    link: "How winners get paid",
  },
  {
    value: "1hr",
    label: "Trust Score target to pay the first half",
    href: "/trust",
    link: "See the public ledger",
  },
  {
    value: "0%",
    label: "taken from winners. Fees are paid on top",
    href: "/how-escrow-works",
    link: "Where the fee comes from",
  },
];

export function TrustBand() {
  return (
    <section className="lp-band" aria-labelledby="lp-trust-heading">
      <div className="lp-frame lp-band-frame">
        <h2 id="lp-trust-heading" className="lp-band-heading">
          The trust layer
          <br />
          for African hackathons
        </h2>
        <TrustStats stats={STATS} />
      </div>
    </section>
  );
}
