import { supabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topics } = req.body;  // Array of topics
  if (!Array.isArray(topics)) {
    return res.status(400).json({ error: 'Topics must be an array' });
  }

  try {
    // Simulate the filtering logic from webhook
    const { data: allContexts } = await supabaseAdmin
      .from('character_context')
      .select('id, type, title, description, tags, link')
      .eq('active', true)
      .overlaps('tags', topics)
      .limit(5);

    const relevantContexts = allContexts
      ?.filter(c => ['post', 'image'].includes(c.type))
      ?.sort((a, b) => {
        const aMatches = a.tags.filter(tag => topics.includes(tag)).length;
        const bMatches = b.tags.filter(tag => topics.includes(tag)).length;
        return bMatches - aMatches;
      })
      ?.slice(0, 2) || [];

    res.status(200).json({
      inputTopics: topics,
      matchedContexts: relevantContexts,
      totalFound: allContexts?.length || 0,
      selectedCount: relevantContexts.length
    });
  } catch (error) {
    console.error('Test context matching error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}