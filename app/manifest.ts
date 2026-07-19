import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IGNITERA Command Center",
    short_name: "IGNITERA",
    description: "社内AI業務OS",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
