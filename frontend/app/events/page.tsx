import Link from "next/link";

export const metadata = {
  title: "Events",
};

export default function EventsPage() {
  return (
    <main className="shell">
      <p className="brand">HackVillage</p>
      <h1>Verified events</h1>
      <p className="lede">
        Only Prize Verified events go live. Event listing will load from
        PostgreSQL once seeded.
      </p>
      <div className="actions">
        <Link className="btn" href="/">
          Back home
        </Link>
      </div>
    </main>
  );
}
