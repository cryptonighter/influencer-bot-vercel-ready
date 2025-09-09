import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  console.log('manage-context API called:', req.method, req.body);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('character_context')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('GET context error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('GET context success:', data);
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('GET context catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { type, title, description, tags, link } = req.body;
    console.log('POST context data:', { type, title, tags });
    try {
      const { data, error } = await supabaseAdmin
        .from('character_context')
        .insert([{ type, title, description, tags, link }])
        .select();
      if (error) {
        console.error('POST context error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('POST context success:', data);
      return res.status(201).json(data[0]);
    } catch (err) {
      console.error('POST context catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    console.log('PUT context data:', { id, ...updates });
    try {
      const { data, error } = await supabaseAdmin
        .from('character_context')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) {
        console.error('PUT context error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('PUT context success:', data);
      return res.status(200).json(data[0]);
    } catch (err) {
      console.error('PUT context catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    console.log('DELETE context id:', id);
    try {
      const { error } = await supabaseAdmin
        .from('character_context')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('DELETE context error:', error);
        return res.status(500).json({ error: error.message });
      }
      console.log('DELETE context success');
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('DELETE context catch:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}