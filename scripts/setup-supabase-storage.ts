import { getSupabaseAdmin, STORAGE_BUCKETS } from "../src/lib/supabase";

async function setupStorage() {
  console.log("Setting up Supabase storage buckets...");

  try {
    const admin = getSupabaseAdmin();
    const { data: existingBuckets, error: listError } = await admin.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      throw listError;
    }

    const bucketNames = Object.values(STORAGE_BUCKETS);

    for (const bucketName of bucketNames) {
      const exists = existingBuckets?.some((b) => b.name === bucketName);

      if (!exists) {
        console.log(`Creating bucket: ${bucketName}`);

        const { error: createError } = await admin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800,
          allowedMimeTypes: ["application/pdf"],
        });

        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
          throw createError;
        }

        console.log(`✓ Created bucket: ${bucketName}`);
      } else {
        console.log(`✓ Bucket already exists: ${bucketName}`);
      }
    }

    console.log("\n✅ Supabase storage setup complete!");
  } catch (error) {
    console.error("❌ Error setting up storage:", error);
    process.exit(1);
  }
}

setupStorage();
