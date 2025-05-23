import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Initialize Neynar client with your API key using the v2 format
const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY,
  baseOptions: {
    headers: {
      "x-neynar-experimental": true,
    },
  },
});

const neynarClient = new NeynarAPIClient(config);

export default neynarClient;
