import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { config } from "./lib/web3Config";
import { appInitializer } from "./lib/appInitializer";
import App from "./App.tsx";
import "./index.css";

// Initialize error suppression and graceful degradation
appInitializer.initialize().then((result) => {
  console.log(`🎯 AION Platform initialized in ${result.mode} mode`);
}).catch((error) => {
  console.error('❌ Failed to initialize AION Platform:', error);
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme({ accentColor: "#f5b300" })}>
        <App />
      </RainbowKitProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </WagmiProvider>
);