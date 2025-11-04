declare module 'viem' {
  export function formatEther(value: bigint): string;
  export function parseEther(value: string): bigint;
  export function formatUnits(value: bigint, decimals: number): string;
  export function parseUnits(value: string, decimals: number): bigint;
}
