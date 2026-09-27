import { BlockList, isIP } from "node:net";

/**
 * Cloudflare's edge ranges. hackvillage.xyz is proxied through Cloudflare
 * before Vercel, so Vercel sees one of these addresses instead of the
 * visitor's. Only a request that really arrived from one of them may have
 * its cf-* headers trusted: anyone can send those headers to the
 * vercel.app URL.
 *
 * The ranges drift a few times a year, so the authoritative lists
 * (https://www.cloudflare.com/ips-v4, /ips-v6) are re-fetched every 24h in
 * process. Module load NEVER blocks on the network: the bundled snapshot is
 * the synchronous default and stays in service whenever the fetch fails.
 */

// ── Fallback snapshot (fetched from cloudflare.com 26 September 2026) ──────
const FALLBACK_IPV4 = [
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

const FALLBACK_IPV6 = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CIDR_PATTERN = /^[\da-f.:]+\/\d{1,3}$/i;

function buildBlockList(cidrs: string[]): BlockList {
  const list = new BlockList();
  for (const cidr of cidrs) {
    const [network, prefix] = cidr.split("/");
    list.addSubnet(network, Number(prefix), isIP(network) === 6 ? "ipv6" : "ipv4");
  }
  return list;
}

// Synchronous default — the bundled snapshot. A successful refresh swaps the
// reference; isCloudflareIp always reads whatever is current.
let ranges = buildBlockList([...FALLBACK_IPV4, ...FALLBACK_IPV6]);

function parseCidrs(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => CIDR_PATTERN.test(line));
}

async function fetchCidrs(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return parseCidrs(await response.text());
}

async function refreshRanges(): Promise<void> {
  try {
    const [v4, v6] = await Promise.all([
      fetchCidrs("https://www.cloudflare.com/ips-v4"),
      fetchCidrs("https://www.cloudflare.com/ips-v6"),
    ]);
    // Refuse an empty/garbage response: the snapshot is better than nothing.
    if (v4.length === 0 || v6.length === 0) throw new Error("empty range list");
    ranges = buildBlockList([...v4, ...v6]);
  } catch (error) {
    console.error("[cloudflare] range refresh failed — keeping the bundled snapshot", error);
  } finally {
    // 24h in-process cache; unref'd so the timer never holds the process open.
    setTimeout(() => void refreshRanges(), REFRESH_INTERVAL_MS).unref();
  }
}

// Fire-and-forget at module init. Skipped in tests so suite results never
// depend on outbound network access (the snapshot is exercised instead).
if (process.env.NODE_ENV !== "test") {
  void refreshRanges();
}

export function isCloudflareIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ranges.check(ip, "ipv4");
  if (version === 6) return ranges.check(ip, "ipv6");
  return false;
}
