const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = "https://ciowvmlicegpvdlzxjly.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb3d2bWxpY2VncHZkbHp4amx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYzMzkzMywiZXhwIjoyMDcxMjA5OTMzfQ.C2M7UvfwK2OLLBdSnnEcdbLZZ4Gp45aYCp3ULrifB7Q";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: plans } = await supabase.from("subscription_plans").select("id, name, max_media_storage, max_file_upload_size, storage_unit");
  
  if (plans) {
    for (const plan of plans) {
      if (plan.storage_unit === "MB" && plan.max_file_upload_size > plan.max_media_storage * 2) {
        // If file upload size is absurdly huge and unit is MB, fix the database records directly.
        // It was likely saved as 15 * 1024 * 1024 * 1024 before the conversion was fixed.
        console.log(`Fixing plan ${plan.name} - file upload limit was ${plan.max_file_upload_size}`);
        await supabase
          .from("subscription_plans")
          .update({ max_file_upload_size: plan.max_media_storage })
          .eq("id", plan.id);
      }
    }
    console.log("DB updated");
  }
}
run();
