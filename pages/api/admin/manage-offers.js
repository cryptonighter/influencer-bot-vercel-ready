import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  console.log('manage-offers API called:', req.method, req.body);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('offers')
        .select('*')
        .eq('active', true);
      if (error) {
        console.error('GET offers error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('GET offers success:', data);
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('GET offers catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { partner_id, title, description, category, price_cents, discount_percent, referral_link, payment_type } = req.body;
    console.log('POST offer data:', { partner_id, title, category, price_cents });
    try {
      const { data, error } = await supabaseAdmin
        .from('offers')
        .insert([{ partner_id, title, description, category, price_cents, discount_percent, referral_link, payment_type }])
        .select();
      if (error) {
        console.error('POST offers error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('POST offers success:', data);
      return res.status(201).json(data[0]);
    } catch (err) {
      console.error('POST offers catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}