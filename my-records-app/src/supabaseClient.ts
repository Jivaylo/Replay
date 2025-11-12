import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xpytdboixqrkpnwxustv.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweXRkYm9peHFya3Bud3h1c3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODM4MjMsImV4cCI6MjA3NDU1OTgyM30.jKxQVpaX-KByAjKzFskJTnTc29uToz14B8lUSfEajpQ"; 

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, 
  },
});
