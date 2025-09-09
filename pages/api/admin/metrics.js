import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Total messages
    const { count: totalMessages } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true });

    // Active sessions (not ended)
    const { count: activeSessions } = await supabaseAdmin
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .is('ended_at', null);

    // Total content modules
    const { count: totalContent } = await supabaseAdmin
      .from('content_modules')
      .select('*', { count: 'exact', head: true });

    res.status(200).json({
      totalUsers,
      totalMessages,
      activeSessions,
      totalContent,
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
}