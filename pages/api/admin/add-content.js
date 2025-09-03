import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, type, price_cents } = req.body;

  if (!title || !body || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data, error } = await supabaseAdmin
      .from('content_modules')
      .insert([{
        slug,
        title,
        type,
        body,
        price_cents: price_cents || 0,
        published: true,
      }])
      .select();

    if (error) throw error;

    res.status(200).json({ success: true, content: data[0] });
  } catch (error) {
    console.error('Add content error:', error);
    res.status(500).json({ error: 'Failed to add content' });
  }
}