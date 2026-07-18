export function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: () => assertEnv("DATABASE_URL"),
  paystackSecretKey: () => assertEnv("PAYSTACK_SECRET_KEY"),
  paystackPublicKey: () => assertEnv("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"),
  smartContractAddress: () => assertEnv("SMART_CONTRACT_ADDRESS"),
  rpcUrl: () => assertEnv("RPC_URL"),
  nextAuthSecret: () => assertEnv("NEXTAUTH_SECRET"),
  nextAuthUrl: () => process.env.NEXTAUTH_URL ?? "http://localhost:3000",
};
