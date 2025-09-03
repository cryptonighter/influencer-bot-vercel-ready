import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .select('*, offers(title), users(external_id)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { id, status, commission_earned_cents } = req.body;
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .update({ status, commission_earned_cents })
      .eq('id', id)
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
}