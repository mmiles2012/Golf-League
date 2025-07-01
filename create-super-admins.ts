
import { storage } from "./server/storage-db";

async function createSuperAdmins() {
  console.log("Creating super-admin accounts...");
  
  const superAdmins = [
    {
      id: "jake-hideout-golf-club",
      email: "jake@hideoutgolf.club",
      firstName: "Jake",
      lastName: null,
      profileImageUrl: null,
      role: "super_admin" as const,
      displayName: "Jake",
      homeClub: null,
      friendsList: [],
      isActive: true,
    },
    {
      id: "e-hideout-golf-club", 
      email: "e@hideoutgolf.club",
      firstName: "E",
      lastName: null,
      profileImageUrl: null,
      role: "super_admin" as const,
      displayName: "E",
      homeClub: null,
      friendsList: [],
      isActive: true,
    }
  ];

  try {
    for (const admin of superAdmins) {
      console.log(`Creating super-admin account for ${admin.email}...`);
      await storage.upsertUser(admin);
      console.log(`✓ Created super-admin account for ${admin.email}`);
    }
    
    console.log("\n✅ All super-admin accounts created successfully!");
    console.log("These users will have full administrative access when they log in.");
    
  } catch (error) {
    console.error("❌ Error creating super-admin accounts:", error);
    throw error;
  }
}

// Run the script
createSuperAdmins()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
