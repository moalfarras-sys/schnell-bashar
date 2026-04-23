import { getSupabaseAdmin, STORAGE_BUCKETS } from "../src/lib/supabase";

const BUCKET_CONFIG: Record<string, { public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }> = {
  [STORAGE_BUCKETS.MEDIA_PUBLIC]: {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"],
  },
  [STORAGE_BUCKETS.OFFERS]: {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  },
  [STORAGE_BUCKETS.SIGNED_CONTRACTS]: {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  },
  [STORAGE_BUCKETS.EXPENSE_RECEIPTS]: {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  },
};

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
      const config = BUCKET_CONFIG[bucketName] ?? {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024,
        allowedMimeTypes: ["application/pdf"],
      };

      if (!exists) {
        console.log(`Creating bucket: ${bucketName}`);

        const { error: createError } = await admin.storage.createBucket(bucketName, config);

        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
          throw createError;
        }

        console.log(`Created bucket: ${bucketName}`);
      } else {
        console.log(`Bucket already exists: ${bucketName}`);
      }
    }

    console.log("\nSupabase storage setup complete.");
  } catch (error) {
    console.error("Error setting up storage:", error);
    process.exit(1);
  }
}

setupStorage();
