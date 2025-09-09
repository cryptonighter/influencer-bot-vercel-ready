-- Synthetic test data for character_context table
-- Run this in Supabase SQL Editor after applying the migration

INSERT INTO character_context (type, title, description, tags, link) VALUES
('post', 'My Journey to Paris', 'Exploring the city of lights and finding inspiration in every corner.', ARRAY['travel', 'inspiration', 'europe'], 'https://instagram.com/p/paris-journey'),
('image', 'Sunset Meditation', 'A serene image of meditating by the ocean at sunset.', ARRAY['meditation', 'self-care', 'nature'], 'https://instagram.com/p/sunset-meditation'),
('post', 'Building Confidence', 'How I overcame self-doubt and built unshakable confidence.', ARRAY['motivation', 'self-improvement', 'confidence'], 'https://instagram.com/p/building-confidence'),
('blog', 'Healthy Eating Tips', 'Simple tips for maintaining a balanced diet and healthy lifestyle.', ARRAY['health', 'nutrition', 'wellness'], 'https://blog.example.com/healthy-eating'),
('image', 'Mountain Adventure', 'Hiking through the Rockies and embracing the thrill of nature.', ARRAY['adventure', 'outdoors', 'travel'], 'https://instagram.com/p/mountain-adventure'),
('post', 'Work-Life Balance', 'Strategies for balancing career ambitions with personal life.', ARRAY['career', 'balance', 'productivity'], 'https://instagram.com/p/work-life-balance'),
('location', 'Favorite Cafe in NYC', 'A cozy spot for coffee and reflection in the heart of the city.', ARRAY['travel', 'reflection', 'urban'], 'https://maps.google.com/cafe-nyc'),
('post', 'Overcoming Fear', 'Facing fears head-on and turning challenges into growth opportunities.', ARRAY['motivation', 'growth', 'resilience'], 'https://instagram.com/p/overcoming-fear'),
('image', 'Creative Workspace', 'My home office setup for maximum creativity and focus.', ARRAY['productivity', 'creativity', 'workspace'], 'https://instagram.com/p/creative-workspace'),
('blog', 'Mindfulness Practices', 'Daily mindfulness exercises to reduce stress and increase awareness.', ARRAY['mindfulness', 'stress-relief', 'wellness'], 'https://blog.example.com/mindfulness-practices');