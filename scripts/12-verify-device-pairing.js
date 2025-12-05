// Database verification script to check device pairing status
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyDevicePairing() {
  console.log("🔍 Checking all devices in database...\n")

  // Get all devices
  const { data: devices, error: devicesError } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)

  if (devicesError) {
    console.error("❌ Error fetching devices:", devicesError)
    return
  }

  console.log(`📱 Found ${devices.length} devices:`)
  devices.forEach((device, index) => {
    console.log(`\n${index + 1}. Device Code: ${device.device_code}`)
    console.log(`   Paired: ${device.is_paired ? "✅" : "❌"}`)
    console.log(`   Screen ID: ${device.screen_id || "None"}`)
    console.log(`   User ID: ${device.user_id || "None"}`)
    console.log(`   Created: ${new Date(device.created_at).toLocaleString()}`)
    console.log(
      `   Last Heartbeat: ${device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleString() : "Never"}`,
    )
  })

  // Check screens with device assignments
  console.log("\n🖥️  Checking screens with device assignments...\n")

  const { data: screens, error: screensError } = await supabase
    .from("screens")
    .select(`
      *,
      devices!devices_screen_id_fkey(device_code, is_paired, last_heartbeat)
    `)
    .order("created_at", { ascending: false })
    .limit(5)

  if (screensError) {
    console.error("❌ Error fetching screens:", screensError)
    return
  }

  console.log(`📺 Found ${screens.length} screens:`)
  screens.forEach((screen, index) => {
    console.log(`\n${index + 1}. Screen: ${screen.name}`)
    console.log(`   Screen ID: ${screen.id}`)
    console.log(`   Status: ${screen.status}`)
    console.log(`   Connected Devices: ${screen.devices?.length || 0}`)
    if (screen.devices?.length > 0) {
      screen.devices.forEach((device) => {
        console.log(`     - Device: ${device.device_code} (Paired: ${device.is_paired ? "✅" : "❌"})`)
      })
    }
  })

  // Test specific device lookup (like the API does)
  const testDeviceCode = "DEV-MEUHOM88" // From the error logs
  console.log(`\n🔍 Testing specific device lookup for: ${testDeviceCode}`)

  const { data: testDevice, error: testError } = await supabase
    .from("devices")
    .select(`
      *,
      screens!devices_screen_id_fkey(
        id,
        name,
        status,
        screen_playlists(
          playlist_id,
          playlists(
            id,
            name,
            playlist_media(
              media_id,
              position,
              duration,
              media(id, filename, file_path, media_type)
            )
          )
        )
      )
    `)
    .eq("device_code", testDeviceCode)
    .eq("is_paired", true)
    .single()

  if (testError) {
    console.log(`❌ Device lookup failed: ${testError.message}`)

    // Try without is_paired filter
    const { data: anyDevice, error: anyError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", testDeviceCode)
      .single()

    if (anyError) {
      console.log(`❌ Device doesn't exist at all: ${anyError.message}`)
    } else {
      console.log(`⚠️  Device exists but is_paired = ${anyDevice.is_paired}`)
      console.log(`   Screen ID: ${anyDevice.screen_id}`)
      console.log(`   User ID: ${anyDevice.user_id}`)
    }
  } else {
    console.log(`✅ Device found and properly paired!`)
    console.log(`   Screen: ${testDevice.screens?.name}`)
    console.log(`   Playlists: ${testDevice.screens?.screen_playlists?.length || 0}`)
  }
}

verifyDevicePairing().catch(console.error)
