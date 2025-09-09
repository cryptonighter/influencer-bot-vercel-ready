import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch users with message counts
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*, messages(count)')
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('GET users error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Enrich with facts and offers
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const { data: logs } = await supabaseAdmin
        .from('conversation_logs')
        .select('facts')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: userReferrals } = await supabaseAdmin
        .from('referrals')
        .select('offers(title), status')
        .eq('user_id', user.id);

      return {
        ...user,
        facts: logs?.[0]?.facts ? JSON.stringify(logs[0].facts) : 'None',
        offers_sent: userReferrals?.map(r => `${r.offers?.title} (${r.status})`).join(', ') || 'None',
        message_count: user.messages?.[0]?.count || 0
      };
    }));

    res.status(200).json(enrichedUsers);
  } catch (err) {
    console.error('User insights error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}