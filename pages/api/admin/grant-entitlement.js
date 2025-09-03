import { supabaseAdmin } from "../../../lib/supabaseAdmin.js"

export default async function handler(req, res) {
  const { userId, moduleId } = req.body
  if (!userId || !moduleId) return res.status(400).json({ error: "Missing params" })

  await supabaseAdmin.from("entitlements").insert({ user_id: userId, content_module_id: moduleId })
  res.status(200).json({ success: true })
}
