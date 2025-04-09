// FarcasterFrameProvider.js
import { createContext, useContext } from "react";

const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children, userData }) {
  return (
    <FarcasterContext.Provider value={{ userData }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
