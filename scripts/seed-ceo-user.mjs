import fs from "fs";
import path from "path";

// Read env
const envPath = path.join(process.cwd(), ".env.local");
const env = fs.readFileSync(envPath, "utf8");
const getEnv = (key) => {
  const m = env.match(new RegExp(`^${key}=["']?([^"'\\r\\n]+)["']?`, "m"));
  return m?.[1]?.trim() ?? "";
};

const PROJECT_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const CEO_USER_ID = "f006ed9e-6fe2-43f6-b411-88867433afc8";

// Get CEO role ID
const rolesRes = await fetch(`${PROJECT_URL}/rest/v1/roles?name=eq.ceo&select=id`, {
  headers: {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
  },
});
const roles = await rolesRes.json();
const ceoRoleId = roles[0]?.id;
console.log("CEO role ID:", ceoRoleId);

// Insert public.users row
const userRes = await fetch(`${PROJECT_URL}/rest/v1/users`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    id: CEO_USER_ID,
    email: "ceo@ignitera.com",
    full_name: "社長",
    role_id: ceoRoleId,
    is_active: true,
  }),
});
const userData = await userRes.json();
console.log("Insert result:", JSON.stringify(userData));
