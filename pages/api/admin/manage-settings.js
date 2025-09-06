import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  console.log('manage-settings API called:', req.method, req.body);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('character_settings')
        .select('*')
        .order('setting_key');
      if (error) {
        console.error('GET settings error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('GET settings success:', data);
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('GET settings catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const settings = req.body;  // Array of { setting_key, setting_value }
    console.log('POST settings:', settings);
    try {
      const updates = settings.map(s => ({
        setting_key: s.key,
        setting_value: s.value,
        updated_at: new Date().toISOString()
      }));
      const { data, error } = await supabaseAdmin
        .from('character_settings')
        .upsert(updates, { onConflict: 'setting_key' })
        .select();
      if (error) {
        console.error('POST settings error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('POST settings success:', data);
      return res.status(200).json(data);
    } catch (err) {
      console.error('POST settings catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}