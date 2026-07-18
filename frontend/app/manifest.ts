import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HackVillage",
    short_name: "HackVillage",
    description:
      "Trust-as-a-Service for developers. Innovation-as-a-Service for organizations.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1F1A",
    theme_color: "#0B3D2E",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-193.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icons/icon-513.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-513.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
