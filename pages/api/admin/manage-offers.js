import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('offers')
      .select('*, partners(name)')
      .eq('active', true);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { partner_id, title, description, category, price_cents, discount_percent, referral_link, payment_type } = req.body;
    const { data, error } = await supabaseAdmin
      .from('offers')
      .insert([{ partner_id, title, description, category, price_cents, discount_percent, referral_link, payment_type }])
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data[0]);
  }

  res.status(405).json({ error: 'Method not allowed' });
}