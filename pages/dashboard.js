import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [content, setContent] = useState({ title: '', body: '', type: 'article', price_cents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
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
        fetchMetrics();
      } else {
        alert('Failed to add content');
      }
    } catch (error) {
      console.error('Error adding content:', error);
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
          .form { background: #111; padding: 20px; border: 1px solid #00ff00; border-radius: 5px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, textarea, select { width: 100%; padding: 10px; background: #222; color: #00ff00; border: 1px solid #00ff00; border-radius: 3px; }
          button { background: #00ff00; color: #000; padding: 10px 20px; border: none; cursor: pointer; font-weight: bold; }
          button:hover { background: #00aa00; }
          .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; overflow: hidden; }
          .matrix-bg::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 2px); animation: matrix 10s linear infinite; }
          @keyframes matrix { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        `}</style>
      </Head>
      <div className="matrix-bg"></div>
      <div className="container">
        <div className="header">
          <h1>Influencer Bot Dashboard</h1>
          <p>Oversee metrics and manage paywalled content</p>
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
            <h3>{metrics.activeSessions || 0}</h3>
            <p>Active Sessions</p>
          </div>
          <div className="metric">
            <h3>{metrics.totalContent || 0}</h3>
            <p>Content Modules</p>
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
        <div className="interests" style={{ marginTop: '40px' }}>
          <h2>Test User Interests</h2>
          <p>Trigger interest-based prompts to users for targeted data collection.</p>
          <button onClick={() => alert('Interest testing feature coming soon!')}>Trigger Test Prompt</button>
        </div>
      </div>
    </>
  );
}