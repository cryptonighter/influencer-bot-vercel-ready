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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, partnersRes, offersRes, referralsRes, contextsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/manage-partners'),
        fetch('/api/admin/manage-offers'),
        fetch('/api/admin/manage-referrals'),
        fetch('/api/admin/manage-context')
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
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setPartners([]);
      setOffers([]);
      setReferrals([]);
      setContexts([]);
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
          .list { background: #111; padding: 20px; border: 1px solid #00ff00; border-radius: 5px; margin-bottom: 40px; }
          .list-item { margin-bottom: 10px; padding: 10px; background: #222; border-radius: 3px; }
        `}</style>
      </Head>
      <div className="matrix-bg"></div>
      <div className="container">
        <div className="header">
          <h1>Influencer Bot Dashboard</h1>
          <p>Oversee metrics, manage partners, offers, and referrals</p>
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
        <div className="form">
          <h2>Add Paywalled Content</h2>
          <form onSubmit={handleAddContent}>
            <div className="form-group">
              <label>Title:</label>
              <input
                type="text"
                value={content.title}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Type:</label>
              <select
                value={content.type}
                onChange={(e) => setContent({ ...content, type: e.target.value })}
              >
                <option value="article">Article</option>
                <option value="course">Course</option>
                <option value="coaching">Coaching</option>
                <option value="tour">Tour</option>
                <option value="offer">Offer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Body:</label>
              <textarea
                value={content.body}
                onChange={(e) => setContent({ ...content, body: e.target.value })}
                rows="10"
                required
              />
            </div>
            <div className="form-group">
              <label>Price (cents):</label>
              <input
                type="number"
                value={content.price_cents}
                onChange={(e) => setContent({ ...content, price_cents: parseInt(e.target.value) })}
                min="0"
              />
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
        <div className="form">
          <h2>Add Character Context</h2>
          <form onSubmit={handleAddContext}>
            <div className="form-group">
              <label>Type:</label>
              <select
                value={newContext.type}
                onChange={(e) => setNewContext({ ...newContext, type: e.target.value })}
              >
                <option value="post">Post</option>
                <option value="image">Image</option>
                <option value="location">Location</option>
                <option value="blog">Blog</option>
              </select>
            </div>
            <div className="form-group">
              <label>Title:</label>
              <input
                type="text"
                value={newContext.title}
                onChange={(e) => setNewContext({ ...newContext, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={newContext.description}
                onChange={(e) => setNewContext({ ...newContext, description: e.target.value })}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Tags (comma-separated):</label>
              <input
                type="text"
                value={newContext.tags}
                onChange={(e) => setNewContext({ ...newContext, tags: e.target.value })}
                placeholder="e.g., travel, motivation, self-care"
              />
            </div>
            <div className="form-group">
              <label>Link:</label>
              <input
                type="url"
                value={newContext.link}
                onChange={(e) => setNewContext({ ...newContext, link: e.target.value })}
              />
            </div>
            <button type="submit">Add Context</button>
          </form>
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
        <div className="form">
          <h2>Test Context Matching</h2>
          <form onSubmit={handleTestMatching}>
            <div className="form-group">
              <label>Topics (comma-separated):</label>
              <input
                type="text"
                value={testTopics}
                onChange={(e) => setTestTopics(e.target.value)}
                placeholder="e.g., travel, motivation, self-care"
                required
              />
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
      </div>
    </>
  );
}