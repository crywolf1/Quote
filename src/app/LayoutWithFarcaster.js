import FarcasterFrameProvider from "./ClientFarcasterProvider"; // Import the client-side provider

export default function LayoutWithFarcaster({ children }) {
  return <FarcasterFrameProvider>{children}</FarcasterFrameProvider>;
}
