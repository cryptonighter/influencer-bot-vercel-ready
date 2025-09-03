import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  console.log('manage-referrals API called:', req.method, req.body);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('referrals')
        .select('*, offers(title), users(external_id)')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('GET referrals error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('GET referrals success:', data);
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('GET referrals catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, status, commission_earned_cents } = req.body;
    console.log('PUT referral data:', { id, status, commission_earned_cents });
    try {
      const { data, error } = await supabaseAdmin
        .from('referrals')
        .update({ status, commission_earned_cents })
        .eq('id', id)
        .select();
      if (error) {
        console.error('PUT referrals error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('PUT referrals success:', data);
      return res.status(200).json(data[0]);
    } catch (err) {
      console.error('PUT referrals catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}