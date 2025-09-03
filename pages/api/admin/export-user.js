import { supabaseAdmin } from "../../../lib/supabaseAdmin.js"

export default async function handler(req, res) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: "Missing userId" })

  const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single()
  const { data: messages } = await supabaseAdmin.from("messages").select("*").eq("user_id", userId)
  const { data: purchases } = await supabaseAdmin.from("purchases").select("*").eq("user_id", userId)

  res.status(200).json({ user, messages, purchases })
}
