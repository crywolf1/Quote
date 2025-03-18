import React, { useEffect, useState } from "react";
import { FarcasterClient } from "@farcaster/frame-sdk";
import Card from "./Card"; // Import the Card component

const UserProfile = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const client = new FarcasterClient();

      try {
        const user = await client.user.get();
        setUserData(user); // Store the user data in state
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Card
        imageUrl={userData.imageUrl} // Pass user image URL as prop
        name={userData.name} // Pass user name as prop
      />
    </div>
  );
};

export default UserProfile;
