import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('partners').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, contact_email, referral_fee_percent } = req.body;
    const { data, error } = await supabaseAdmin
      .from('partners')
      .insert([{ name, contact_email, referral_fee_percent }])
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data[0]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    console.log('DELETE partner id:', id);
    try {
      // Delete associated offers first (cascade in DB, but handle here for safety)
      await supabaseAdmin.from('offers').delete().eq('partner_id', id);
      const { error } = await supabaseAdmin
        .from('partners')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('DELETE partner error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('DELETE partner success');
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('DELETE partner catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}