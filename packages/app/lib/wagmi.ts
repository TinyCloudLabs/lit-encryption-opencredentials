import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

// Configure supported chains
export const chains = [mainnet, sepolia] as const;

// Create wagmi configuration with native connectors for wagmi v2
export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
    }),
  ],
  transports: {
    [mainnet.id]: http('https://eth.llamarpc.com'),
    [sepolia.id]: http('https://eth-sepolia.public.blastapi.io'),
  },
});