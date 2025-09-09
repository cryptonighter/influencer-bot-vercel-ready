import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [content, setContent] = useState({ title: '', body: '', type: 'article', price_cents: 0 });
  const [partners, setPartners] = useState([]);
  const [offers, setOffers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [newPartner, setNewPartner] = useState({ name: '', contact_email: '', referral_fee_percent: 10 });
  const [newOffer, setNewOffer] = useState({ partner_id: '', title: '', description: '', category: '', price_cents: 0, discount_percent: 0, referral_link: '', payment_type: 'external' });
  const [newContext, setNewContext] = useState({ type: 'post', title: '', description: '', tags: '', link: '' });
  const [testTopics, setTestTopics] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, partnersRes, offersRes, referralsRes, contextsRes, settingsRes, usersRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/manage-partners'),
        fetch('/api/admin/manage-offers'),
        fetch('/api/admin/manage-referrals'),
        fetch('/api/admin/manage-context'),
        fetch('/api/admin/manage-settings'),
        fetch('/api/admin/user-insights')
      ]);
      setMetrics(await metricsRes.json());
      const partnersData = await partnersRes.json();
      setPartners(Array.isArray(partnersData) ? partnersData : []);
      const offersData = await offersRes.json();
      setOffers(Array.isArray(offersData) ? offersData : []);
      const referralsData = await referralsRes.json();
      setReferrals(Array.isArray(referralsData) ? referralsData : []);
      const contextsData = await contextsRes.json();
      setContexts(Array.isArray(contextsData) ? contextsData : []);
      const settingsData = await settingsRes.json();
      const settingsObj = {};
      settingsData.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
      setSettings(settingsObj);
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setPartners([]);
      setOffers([]);
      setReferrals([]);
      setContexts([]);
      setSettings({});
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/add-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      if (res.ok) {
        alert('Content added successfully!');
        setContent({ title: '', body: '', type: 'article', price_cents: 0 });
        fetchData();
      } else {
        alert('Failed to add content');
      }
    } catch (error) {
      console.error('Error adding content:', error);
    }
  };

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/manage-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartner),
      });
      if (res.ok) {
        alert('Partner added successfully!');
        setNewPartner({ name: '', contact_email: '', referral_fee_percent: 10 });
        fetchData();
      } else {
        alert('Failed to add partner');
      }
    } catch (error) {
      console.error('Error adding partner:', error);
    }
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/manage-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOffer),
      });
      if (res.ok) {
        alert('Offer added successfully!');
        setNewOffer({ partner_id: '', title: '', description: '', category: '', price_cents: 0, discount_percent: 0, referral_link: '', payment_type: 'external' });
        fetchData();
      } else {
        alert('Failed to add offer');
      }
    } catch (error) {
      console.error('Error adding offer:', error);
    }
  };

  const handleAddContext = async (e) => {
    e.preventDefault();
    try {
      const tagsArray = newContext.tags.split(',').map(t => t.trim()).filter(t => t);
      const res = await fetch('/api/admin/manage-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newContext, tags: tagsArray }),
      });
      if (res.ok) {
        alert('Context added successfully!');
        setNewContext({ type: 'post', title: '', description: '', tags: '', link: '' });
        fetchData();
      } else {
        alert('Failed to add context');
      }
    } catch (error) {
      console.error('Error adding context:', error);
    }
  };

  const handleTestMatching = async (e) => {
    e.preventDefault();
    try {
      const topicsArray = testTopics.split(',').map(t => t.trim()).filter(t => t);
      const res = await fetch('/api/admin/test-context-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: topicsArray }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      } else {
        alert('Test failed');
      }
    } catch (error) {
      console.error('Error testing matching:', error);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      let endpoint;
      if (type === 'partner') endpoint = '/api/admin/manage-partners';
      else if (type === 'offer') endpoint = '/api/admin/manage-offers';
      else if (type === 'context') endpoint = '/api/admin/manage-context';
      const res = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`${type} deleted successfully!`);
        fetchData();
      } else {
        alert('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const generateStrategy = async (userId) => {
    try {
      const res = await fetch(`/api/admin/generate-strategy/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser({ ...selectedUser, strategy: data.strategy });
      } else {
        alert('Failed to generate strategy');
      }
    } catch (error) {
      console.error('Error generating strategy:', error);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const settingsArray = Object.keys(settings).map(key => ({ key, value: settings[key] }));
      const res = await fetch('/api/admin/manage-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsArray),
      });
      if (res.ok) {
        alert('Settings saved successfully!');
        fetchData();
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <Head>
        <title>Influencer Bot Dashboard</title>
        <style>{`
          body { background: #000; color: #00ff00; font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
          .metric { background: #111; padding: 20px; border: 1px solid #00ff00; border-radius: 5px; text-align: center; }
          .metric h3 { margin: 0 0 10px 0; font-size: 2em; }
          .form { background: #111; padding: 20px; border: 1px solid #00ff00; border-radius: 5px; margin-bottom: 40px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, textarea, select { width: 100%; padding: 10px; background: #222; color: #00ff00; border: 1px solid #00ff00; border-radius: 3px; }
          button { background: #00ff00; color: #000; padding: 10px 20px; border: none; cursor: pointer; font-weight: bold; }
          button:hover { background: #00aa00; }
          .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; overflow: hidden; }
          .matrix-bg::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 2px); animation: matrix 10s linear infinite; }
          @keyframes matrix { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
          .tabs { display: flex; margin-bottom: 20px; }
          .tabs button { background: #111; color: #00ff00; border: 1px solid #00ff00; padding: 10px 20px; cursor: pointer; }
          .tabs button.active { background: #00ff00; color: #000; }
          .tabs button:hover { background: #222; }
          .user-detail { background: #111; padding: 20px; border: 1px solid #00ff00; border-radius: 5px; margin-top: 20px; }
          .list { background: #111; padding: 20px; border: 1px solid #00ff00; border-radius: 5px; margin-bottom: 40px; }
          .list-item { margin-bottom: 10px; padding: 10px; background: #222; border-radius: 3px; }
        `}</style>
      </Head>
      <div className="matrix-bg"></div>
      <div className="container">
        <div className="header">
          <h1>Influencer Bot Dashboard</h1>
          <p>Oversee metrics, manage content, and gain user insights</p>
        </div>
        <div className="metrics">
          <div className="metric">
            <h3>{metrics.totalUsers || 0}</h3>
            <p>Total Users</p>
          </div>
          <div className="metric">
            <h3>{metrics.totalMessages || 0}</h3>
            <p>Total Messages</p>
          </div>
          <div className="metric">
            <h3>{partners.length}</h3>
            <p>Total Partners</p>
          </div>
          <div className="metric">
            <h3>{offers.length}</h3>
            <p>Total Offers</p>
          </div>
          <div className="metric">
            <h3>{referrals.length}</h3>
            <p>Total Referrals</p>
          </div>
        </div>

        <div className="tabs">
          <button onClick={() => setActiveTab('content')} className={activeTab === 'content' ? 'active' : ''}>Paywall & Partners</button>
          <button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'active' : ''}>User Insights</button>
          <button onClick={() => setActiveTab('character')} className={activeTab === 'character' ? 'active' : ''}>Bot Settings</button>
        </div>

        {activeTab === 'content' && (
          <div>
            <div className="form">
              <h2>Add Paywalled Content</h2>
              <p>Users can buy tokens for AI interactions and unique chatbot programs (coaching, challenges, goal planning).</p>
              <form onSubmit={handleAddContent}>
                <div className="form-group">
                  <label>Title:</label>
                  <input type="text" value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Type:</label>
                  <select value={content.type} onChange={(e) => setContent({ ...content, type: e.target.value })}>
                    <option value="article">Article</option><option value="course">Course</option><option value="coaching">Coaching</option><option value="tour">Tour</option><option value="offer">Offer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Body:</label>
                  <textarea value={content.body} onChange={(e) => setContent({ ...content, body: e.target.value })} rows="10" required />
                </div>
                <div className="form-group">
                  <label>Price (cents):</label>
                  <input type="number" value={content.price_cents} onChange={(e) => setContent({ ...content, price_cents: parseInt(e.target.value) })} min="0" />
                </div>
                <button type="submit">Add Content</button>
              </form>
            </div>

            

            <div className="form">
              <h2>Add Partner</h2>
              <form onSubmit={handleAddPartner}>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Email:</label>
                  <input
                    type="email"
                    value={newPartner.contact_email}
                    onChange={(e) => setNewPartner({ ...newPartner, contact_email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Referral Fee (%):</label>
                  <input
                    type="number"
                    value={newPartner.referral_fee_percent}
                    onChange={(e) => setNewPartner({ ...newPartner, referral_fee_percent: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                  />
                </div>
                <button type="submit">Add Partner</button>
              </form>
            </div>
            <div className="form">
              <h2>Add Offer</h2>
              <form onSubmit={handleAddOffer}>
                <div className="form-group">
                  <label>Partner:</label>
                  <select
                    value={newOffer.partner_id}
                    onChange={(e) => setNewOffer({ ...newOffer, partner_id: e.target.value })}
                    required
                  >
                    <option value="">Select Partner</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Title:</label>
                  <input
                    type="text"
                    value={newOffer.title}
                    onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={newOffer.description}
                    onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Category:</label>
                  <input
                    type="text"
                    value={newOffer.category}
                    onChange={(e) => setNewOffer({ ...newOffer, category: e.target.value })}
                    placeholder="e.g., pregnancy, career"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price (cents):</label>
                  <input
                    type="number"
                    value={newOffer.price_cents}
                    onChange={(e) => setNewOffer({ ...newOffer, price_cents: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Discount (%):</label>
                  <input
                    type="number"
                    value={newOffer.discount_percent}
                    onChange={(e) => setNewOffer({ ...newOffer, discount_percent: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label>Referral Link:</label>
                  <input
                    type="url"
                    value={newOffer.referral_link}
                    onChange={(e) => setNewOffer({ ...newOffer, referral_link: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Type:</label>
                  <select
                    value={newOffer.payment_type}
                    onChange={(e) => setNewOffer({ ...newOffer, payment_type: e.target.value })}
                  >
                    <option value="external">External</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>
                <button type="submit">Add Offer</button>
              </form>
            </div>
            <div className="list">
              <h2>Partners</h2>
              {partners.map(p => (
                <div key={p.id} className="list-item">
                  <strong>{p.name}</strong> - {p.contact_email} - {p.referral_fee_percent}% fee
                  <button onClick={() => handleDelete('partner', p.id)} style={{ marginLeft: '10px', background: '#ff0000', color: '#fff' }}>x</button>
                </div>
              ))}
            </div>
            <div className="list">
              <h2>Offers</h2>
              {offers.map(o => (
                <div key={o.id} className="list-item">
                  <strong>{o.title}</strong> - {o.category} - ${(o.price_cents / 100).toFixed(2)} ({o.discount_percent}% off)
                  <button onClick={() => handleDelete('offer', o.id)} style={{ marginLeft: '10px', background: '#ff0000', color: '#fff' }}>x</button>
                </div>
              ))}
            </div>
            <div className="list">
              <h2>Referrals</h2>
              {referrals.map(r => (
                <div key={r.id} className="list-item">
                  User: {r.users?.external_id} - Offer: {r.offers?.title} - Status: {r.status} - Commission: ${(r.commission_earned_cents / 100).toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="list">
              <h2>User Insights</h2>
              {users.map(u => (
                <div key={u.id} className="list-item" onClick={() => setSelectedUser(u)}>
                  <strong>User {u.external_id}</strong> - Last Seen: {new Date(u.last_seen).toLocaleDateString()} - Messages: {u.message_count || 0}
                </div>
              ))}
            </div>
            {selectedUser && (
              <div className="user-detail">
                <h3>Details for User {selectedUser.external_id}</h3>
                <div>
                  <h4>Facts</h4>
                  <ul>
                    {Object.entries(JSON.parse(selectedUser.facts || '{}')).map(([key, value]) => (
                      <li key={key}><strong>{key}:</strong> {value}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Offers Sent</h4>
                  <ul>
                    {selectedUser.offers_sent.split(', ').map((offer, idx) => (
                      <li key={idx}>{offer}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Strategy</h4>
                  <textarea value={selectedUser.strategy || ''} readOnly rows="5" placeholder="Click Generate Strategy" />
                  <button onClick={() => generateStrategy(selectedUser.id)}>Generate Strategy</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'character' && (
          <div>
            <div className="form">
              <h2>Character Settings</h2>
              <form onSubmit={handleSaveSettings}>
                <h3>Personality Traits</h3>
                <div className="form-group">
                  <label>Tone:</label>
                  <select value={settings.tone || 'Grounded'} onChange={(e) => setSettings({ ...settings, tone: e.target.value })}>
                    <option>Grounded</option><option>Enthusiastic</option><option>Empathetic</option><option>Direct</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Communication Style:</label>
                  <select value={settings.communication_style || 'Conversational'} onChange={(e) => setSettings({ ...settings, communication_style: e.target.value })}>
                    <option>Conversational</option><option>Professional</option><option>Casual</option><option>Inspirational</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Energy Level:</label>
                  <input type="range" min="1" max="3" value={settings.energy_level || 2} onChange={(e) => setSettings({ ...settings, energy_level: parseInt(e.target.value) })} />
                  <span>{settings.energy_level === 1 ? 'Low' : settings.energy_level === 2 ? 'Medium' : 'High'}</span>
                </div>

                <h3>Behavioral Rules</h3>
                <div className="form-group">
                  <label>Style Mirroring Level (%):</label>
                  <input type="range" min="0" max="100" value={settings.style_mirroring || 50} onChange={(e) => setSettings({ ...settings, style_mirroring: parseInt(e.target.value) })} />
                  <span>{settings.style_mirroring}%</span>
                </div>
                <div className="form-group">
                  <label>Grounding Level (%):</label>
                  <input type="range" min="0" max="100" value={settings.grounding_level || 80} onChange={(e) => setSettings({ ...settings, grounding_level: parseInt(e.target.value) })} />
                  <span>{settings.grounding_level}%</span>
                </div>
                <div className="form-group">
                  <label>Response Length (Min-Max words):</label>
                  <input type="text" value={settings.response_length || '50-200'} onChange={(e) => setSettings({ ...settings, response_length: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Question Frequency:</label>
                  <select value={settings.question_frequency || 'Sometimes'} onChange={(e) => setSettings({ ...settings, question_frequency: e.target.value })}>
                    <option>Always</option><option>Sometimes</option><option>Rarely</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Offer Timing:</label>
                  <select value={settings.offer_timing || 'Relevant'} onChange={(e) => setSettings({ ...settings, offer_timing: e.target.value })}>
                    <option>Early</option><option>Relevant</option><option>On-Demand</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Repetition Check:</label>
                  <input type="checkbox" checked={settings.repetition_check || true} onChange={(e) => setSettings({ ...settings, repetition_check: e.target.checked })} />
                </div>

                <h3>Memory and Context Management</h3>
                <div className="form-group">
                  <label>Context Memory Duration:</label>
                  <select value={settings.memory_duration || '1 Week'} onChange={(e) => setSettings({ ...settings, memory_duration: e.target.value })}>
                    <option>1 Day</option><option>1 Week</option><option>1 Month</option><option>Forever</option>
                  </select>
                </div>

                <h3>Custom Overrides</h3>
                <div className="form-group">
                  <label>System Prompt:</label>
                  <textarea value={settings.system_prompt || ''} onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })} rows="5" />
                </div>
                <div className="form-group">
                  <label>Greeting:</label>
                  <input type="text" value={settings.greeting || ''} onChange={(e) => setSettings({ ...settings, greeting: e.target.value })} />
                </div>

                <button type="submit">Save Settings</button>
              </form>
            </div>

            <div className="form">
              <h2>Test Context Matching</h2>
              <form onSubmit={handleTestMatching}>
                <div className="form-group">
                  <label>Topics (comma-separated):</label>
                  <input type="text" value={testTopics} onChange={(e) => setTestTopics(e.target.value)} placeholder="e.g., travel, motivation, self-care" required />
                </div>
                <button type="submit">Test Matching</button>
              </form>
              {testResults && (
                <div style={{ marginTop: '20px' }}>
                  <h3>Test Results</h3>
                  <p><strong>Input Topics:</strong> {testResults.inputTopics.join(', ')}</p>
                  <p><strong>Total Found:</strong> {testResults.totalFound}</p>
                  <p><strong>Selected for Bot:</strong> {testResults.selectedCount}</p>
                  <ul>
                    {testResults.matchedContexts.map(c => (
                      <li key={c.id}>
                        <strong>{c.title}</strong> ({c.type}) - Tags: {c.tags.join(', ')} - <a href={c.link} target="_blank">Link</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="list">
              <h2>Character Contexts</h2>
              {contexts.map(c => (
                <div key={c.id} className="list-item">
                  <strong>{c.title}</strong> ({c.type}) - Tags: {c.tags?.join(', ')} - <a href={c.link} target="_blank">Link</a>
                  <button onClick={() => handleDelete('context', c.id)} style={{ marginLeft: '10px', background: '#ff0000', color: '#fff' }}>x</button>
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </>
  );
}