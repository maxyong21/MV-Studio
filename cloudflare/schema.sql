-- MV Studio production schema for Cloudflare D1 (SQLite).
-- Apply with: npx wrangler d1 execute mv-studio --remote --file=cloudflare/schema.sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS site_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL DEFAULT '',
  price REAL, original_price REAL, currency TEXT NOT NULL DEFAULT 'RM',
  summary TEXT NOT NULL DEFAULT '', features TEXT NOT NULL DEFAULT '[]',
  timeline TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '', seo_title TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '', demo_url TEXT NOT NULL DEFAULT '', video_url TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]', featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '', linkedin_url TEXT NOT NULL DEFAULT '', github_url TEXT NOT NULL DEFAULT '', website_url TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', button_label TEXT NOT NULL DEFAULT 'Learn more',
  button_url TEXT NOT NULL DEFAULT '#services', image_url TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT, ends_at TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS feature_options (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'core' CHECK (category IN ('core','third_party','maintenance')),
  billing_type TEXT NOT NULL DEFAULT 'quote' CHECK (billing_type IN ('one_time','monthly','quote')),
  price REAL CHECK (price IS NULL OR price >= 0), annual_free_months INTEGER NOT NULL DEFAULT 0 CHECK (annual_free_months BETWEEN 0 AND 11),
  active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, company_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '', selected_features TEXT NOT NULL DEFAULT '[]',
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','yearly')),
  one_time_estimate REAL NOT NULL DEFAULT 0, monthly_estimate REAL NOT NULL DEFAULT 0, annual_estimate REAL NOT NULL DEFAULT 0,
  meeting_requested INTEGER NOT NULL DEFAULT 0, preferred_meeting_at TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','won','closed')),
  notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending','sent','failed')),
  notification_error TEXT NOT NULL DEFAULT '', resend_email_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS enquiry_rate_limits (
  key_hash TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL, submission_count INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS services_visible_order ON services(active, sort_order);
CREATE INDEX IF NOT EXISTS projects_visible_order ON projects(active, sort_order);
CREATE INDEX IF NOT EXISTS team_visible_order ON team_members(active, sort_order);
CREATE INDEX IF NOT EXISTS features_visible_order ON feature_options(active, sort_order);
CREATE INDEX IF NOT EXISTS enquiries_recent ON enquiries(created_at DESC);

INSERT OR IGNORE INTO site_content(id,content) VALUES (1, '{"hero_eyebrow":"Independent web studio · Malaysia","hero_title":"Digital, made more human.","hero_description":"We build thoughtful websites and digital tools that help ambitious small businesses move forward.","hero_cta":"Tell us what you’re building","about_title":"A small team for the big next step.","about_text":"Starting or growing a business is already a lot. We make the digital part feel clearer, with honest advice, considered design, and the people building your site by your side.","seo_title":"Web Design & Development for Small Businesses | MV Studio","seo_description":"Affordable web design and development for small businesses in Malaysia. Websites, e-commerce stores, custom web apps, and ongoing support.","email_max":"fengzhen221@gmail.com","email_vincent":"teovincentkq1611@gmail.com","whatsapp_max":"60162238196","whatsapp_vincent":"601154039173","contact_emails":"fengzhen221@gmail.com\nteovincentkq1611@gmail.com","contact_phones":"+60 16-223 8196\n+60 11-5403 9173"}');
INSERT OR IGNORE INTO services(id,name,category,price,original_price,currency,summary,features,timeline,active,sort_order) VALUES
('seed-1','Landing Page','01 / Starter',449,499,'RM','A clear, focused page that introduces your business and turns visits into enquiries.','["One conversion-focused page","Responsive design","Contact form and WhatsApp","Social media links"]','Ready in 7 days',1,1),
('seed-2','Company Website','02 / Business',989,1099,'RM','A polished multi-page home for your company, products, and services.','["Up to five pages","Product and service sections","Contact form and WhatsApp","SEO-ready foundations"]','Timeline confirmed together',1,2),
('seed-3','E-Commerce','03 / Online store',1709,1899,'RM','A smoother way to show your products, take orders, and grow online.','["Product catalogue and cart","Customer accounts","Inventory and order tools","Payment integration"]','Timeline confirmed together',1,3),
('seed-4','Custom Web App','04 / Made for you',NULL,NULL,'RM','A practical digital system shaped around how your business works.','["Booking and management systems","Database design","API integrations","Custom workflows"]','Custom quote',1,4);
INSERT OR IGNORE INTO projects(id,name,category,summary,seo_title,seo_description,image_url,demo_url,tags,featured,active,sort_order) VALUES
('seed-p1','APMoodle','Learning platform','A learning management system where students access materials, take themed quizzes, and track progress.','APMoodle Learning Management System | MV Studio','A custom learning management system with course materials, themed quizzes, student progress tracking, and lecturer tools.','aphome.png','APMoodle.html','["ASP.NET Core","C#","PostgreSQL"]',1,1,1),
('seed-p2','HyperText Edu','Web application','A gamified platform that helps students learn HTML with quizzes and coding challenges.','HyperText Edu Web Learning Platform | MV Studio','A gamified HTML learning platform featuring interactive quizzes, coding challenges, and content management.','Hypertextlogo.jpg','hypertextedu.html','["JavaScript","CSS","Learning"]',1,1,2),
('seed-p3','Psychology Consultation','Booking system','A consultation booking and management system for students and lecturers.','Psychology Consultation Booking System | MV Studio','A consultation scheduling and management system for psychology students and lecturers, with booking and feedback tools.','logomanagement.png','PsychologyConsultationManagementSystem.html','["Java","Scheduling"]',1,1,3),
('seed-p4','Super Maths Bros','Educational game','A game-based learning experience for differentiation, with lessons, quizzes, and progress tracking.','Super Maths Bros Educational Game | MV Studio','A game-based mathematics learning experience with interactive lessons, quizzes, rewards, and lecturer progress tracking.','supermathsbrologo.png','SuperMathsBros.html','["Python","MySQL","Game design"]',1,1,4);
INSERT OR IGNORE INTO team_members(id,name,role,bio,image_url,linkedin_url,github_url,website_url,active,sort_order) VALUES
('seed-t1','Max Yong','Full-Stack Developer','Max leads the technical direction of projects, bringing clean architecture and thoughtful integrations together.','yongzhenfeng.jpg','https://www.linkedin.com/in/yong-zhen-feng-2a8415312','https://github.com/maxyong21','http://yongzhenfeng.netlify.app/',1,1),
('seed-t2','Vincent Teo','Full-Stack Developer','Vincent builds responsive websites and reliable web applications with care for the details people use every day.','Vincent.webp','https://www.linkedin.com/in/kai-qi-vincent-teo-1596ab286/','https://github.com/VincentTeo1116/','https://vincent16-portfolio.vercel.app/',1,2);
INSERT OR IGNORE INTO feature_options(id,name,description,category,billing_type,price,annual_free_months,active,sort_order) VALUES
('seed-f1','Landing page','A focused page for a campaign, product, or service.','core','one_time',449,0,1,1),
('seed-f2','Payment page','Checkout and payment provider integration, scoped to your provider.','core','quote',NULL,0,1,2),
('seed-f3','Customer dashboard','A tailored dashboard with useful account or business data.','core','quote',NULL,0,1,3),
('seed-f4','Hosting','Website hosting; provider and plan confirmed to suit your needs.','third_party','monthly',30,0,1,4),
('seed-f5','Server setup','Server configuration and deployment support.','third_party','quote',NULL,0,1,5),
('seed-f6','Domain registration','Domain registration; final price depends on domain and registrar.','third_party','quote',NULL,0,1,6),
('seed-f7','Website maintenance','Updates, backups, and ongoing site care.','maintenance','monthly',120,1,1,7);
