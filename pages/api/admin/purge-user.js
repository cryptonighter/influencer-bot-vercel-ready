import { supabaseAdmin } from "../../lib/supabaseAdmin.js"

export default async function handler(req, res) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: "Missing userId" })

  await supabaseAdmin.from("users").delete().eq("id", userId)
  await supabaseAdmin.from("messages").delete().eq("user_id", userId)
  await supabaseAdmin.from("purchases").delete().eq("user_id", userId)

  res.status(200).json({ success: true })
}
