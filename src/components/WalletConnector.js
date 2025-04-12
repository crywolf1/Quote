export const walletConfig = {
  appName: "Quote App",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: ["base"],
  frameConfig: {
    version: "next",
    image: "https://quote-production-679a.up.railway.app/icon.png",
    buttons: [
      {
        label: "Connect Wallet",
        action: "post",
      },
    ],
  },
};
