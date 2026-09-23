import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HackVillage",
    short_name: "HackVillage",
    description:
      "The open-source infrastructure for high-impact tech events. 100% escrowed prize pools, 50% instant payouts, verified Proof-of-Work profiles.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbf7",
    theme_color: "#ffed00",
    icons: [
      {
        src: "/branding/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/branding/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
