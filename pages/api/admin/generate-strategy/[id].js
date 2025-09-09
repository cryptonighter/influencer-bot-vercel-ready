import { supabaseAdmin } from '../../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Fetch user data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    const { data: logs } = await supabaseAdmin
      .from('conversation_logs')
      .select('summary, topics, facts')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select('offers(title, category), status')
      .eq('user_id', id);

    const context = `User: ${JSON.stringify(user)}\nLogs: ${logs?.map(l => l.summary).join(', ')}\nReferrals: ${referrals?.map(r => r.offers?.title).join(', ')}`;

    // Generate strategy with AI
    const payload = {
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Analyze user data and suggest a conversation/sales strategy: when to propose offers, self-development steps, etc.' },
        { role: 'user', content: `Generate a strategy for this user: ${context}` }
      ],
      max_tokens: 300
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'AI failed' });
    }

    const data = await response.json();
    const strategy = data.choices[0].message.content;

    res.status(200).json({ strategy });
  } catch (err) {
    console.error('Generate strategy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}