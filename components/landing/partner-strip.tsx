import Image from "next/image";

interface Partner {
  name: string;
  src: string;
  width: number;
  height: number;
}

/* Intrinsic sizes keep each mark's aspect ratio; CSS sets the rendered height. */
const PARTNERS: Partner[] = [
  {
    name: "Salamander Tech Hub",
    src: "/images/salamander-logo-yellow.svg",
    width: 359,
    height: 100,
  },
  { name: "Technetium Kenya", src: "/partners/technetium-kenya-logo.png", width: 350, height: 95 },
  {
    name: "SkillsSync Global",
    src: "/partners/skillssync-global-logo.webp",
    width: 1000,
    height: 199,
  },
];

/* Enough copies of the three marks to overfill the widest frame. */
const SET = [...PARTNERS, ...PARTNERS];

/**
 * The logo wall: the organisations HackVillage is built with, drifting
 * past in a marquee. The row is doubled so the loop has no seam; the
 * second copy is hidden from assistive tech so each name is read once.
 */
export function PartnerStrip() {
  const row = (hidden: boolean) =>
    SET.map((partner, i) => {
      const onceOnly = !hidden && i < PARTNERS.length;
      return (
        <li
          key={`${partner.name}-${hidden ? "b" : "a"}-${i}`}
          className="lp-partner"
          aria-hidden={onceOnly ? undefined : true}
        >
          <Image
            src={partner.src}
            alt={onceOnly ? partner.name : ""}
            width={partner.width}
            height={partner.height}
            unoptimized={partner.src.endsWith(".svg")}
            className={`lp-partner-logo lp-partner-${partner.name.split(" ")[0].toLowerCase()}`}
          />
        </li>
      );
    });

  return (
    <section className="lp-tracks" aria-label="Our partners">
      <div className="lp-frame lp-tracks-frame">
        <ul className="lp-tracks-row">
          {row(false)}
          {row(true)}
        </ul>
      </div>
    </section>
  );
}
