const FarcasterContext = createContext();

export function FarcasterFrameProvider({ children }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Step 1: Signal readiness
        await sdk.actions.ready();
        console.log("SDK is ready");

        // Step 2: Attempt sign-in
        console.log("Attempting sign-in...");
        const signInResult = await sdk.signin();
        console.log("Sign-in result:", signInResult);

        // Step 3: Get user data from sign-in result
        if (signInResult && signInResult.username) {
          setUserData({
            username: signInResult.username,
            pfpUrl: signInResult.pfpUrl || "/default-avatar.jpg",
          });
          console.log("User data set:", signInResult);
        } else {
          console.warn("No valid user data found after sign-in");
          setUserData({
            username: "Guest",
            pfpUrl: "/default-avatar.jpg",
          });
        }
      } catch (error) {
        console.error("SDK initialization or sign-in failed:", error);
        setUserData({
          username: "Guest",
          pfpUrl: "/default-avatar.jpg",
        });
      }
    };
    initializeSDK();
  }, []);

  return (
    <FarcasterContext.Provider value={{ userData }}>
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcaster() {
  return useContext(FarcasterContext);
}
