import { BlockList, isIP } from "node:net";

/**
 * Cloudflare's published edge ranges (https://www.cloudflare.com/ips/,
 * fetched 26 September 2026). hackvillage.xyz is proxied through Cloudflare
 * before Vercel, so Vercel sees one of these addresses instead of the
 * visitor's. Only a request that really arrived from one of them may have its
 * cf-* headers trusted: anyone can send those headers to the vercel.app URL.
 */
const CLOUDFLARE_IPV4 = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

const CLOUDFLARE_IPV6 = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const ranges = new BlockList();
for (const cidr of CLOUDFLARE_IPV4) {
  const [network, prefix] = cidr.split("/");
  ranges.addSubnet(network, Number(prefix), "ipv4");
}
for (const cidr of CLOUDFLARE_IPV6) {
  const [network, prefix] = cidr.split("/");
  ranges.addSubnet(network, Number(prefix), "ipv6");
}

export function isCloudflareIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ranges.check(ip, "ipv4");
  if (version === 6) return ranges.check(ip, "ipv6");
  return false;
}
