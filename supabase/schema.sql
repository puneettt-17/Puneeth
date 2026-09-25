-- ==============================================================================
-- Aegis Enterprise AI Portal — Supabase PostgreSQL Schema & Security Policies
-- Enables: Enterprise Agent Fleet, Task Trajectories, DLP Logs, pgvector RAG
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Used for semantic RAG document embeddings

-- 2. Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'gemini-1.5-pro',
    status TEXT NOT NULL DEFAULT 'ready',
    description TEXT,
    tasks_completed INTEGER DEFAULT 0,
    confidence TEXT DEFAULT '99.5%',
    temperature NUMERIC DEFAULT 0.2,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Task Trajectories Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES public.agents(id) ON DELETE SET NULL,
    agent_name TEXT NOT NULL,
    name TEXT NOT NULL,
    directive TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'complete',
    logs JSONB DEFAULT '[]'::jsonb,
    duration_ms INTEGER DEFAULT 100,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DLP Guardrail Events Table (Audit Log)
CREATE TABLE IF NOT EXISTS public.dlp_events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    source_agent TEXT NOT NULL,
    detection_type TEXT NOT NULL,
    original_snippet TEXT NOT NULL,
    sanitized_snippet TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    confidence TEXT DEFAULT '99.9%',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enterprise Knowledge Documents (RAG Vector Store)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    verified_by TEXT NOT NULL,
    last_updated DATE DEFAULT CURRENT_DATE,
    embedding vector(1536), -- Optional OpenAI / Gemini text embedding vector
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Connectors Table
CREATE TABLE IF NOT EXISTS public.connectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    protocol TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected',
    latency_ms INTEGER DEFAULT 20,
    details TEXT,
    last_checked TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. System Metrics Table
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id SERIAL PRIMARY KEY,
    active_agents INTEGER DEFAULT 4,
    total_pool INTEGER DEFAULT 16,
    uptime TEXT DEFAULT '99.98%',
    guardrail_interceptions INTEGER DEFAULT 4,
    sanitized_tokens BIGINT DEFAULT 1420580,
    rag_grounding_score NUMERIC DEFAULT 99.4,
    avg_latency_ms INTEGER DEFAULT 138,
    cache_hit_rate NUMERIC DEFAULT 43.5,
    total_requests BIGINT DEFAULT 18492,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dlp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users & anon clients
CREATE POLICY "Public read agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Public insert agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete agents" ON public.agents FOR DELETE USING (true);

CREATE POLICY "Public read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read dlp_events" ON public.dlp_events FOR SELECT USING (true);
CREATE POLICY "Public insert dlp_events" ON public.dlp_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read knowledge_documents" ON public.knowledge_documents FOR SELECT USING (true);
CREATE POLICY "Public insert knowledge_documents" ON public.knowledge_documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read connectors" ON public.connectors FOR SELECT USING (true);
CREATE POLICY "Public update connectors" ON public.connectors FOR UPDATE USING (true);

CREATE POLICY "Public read system_metrics" ON public.system_metrics FOR SELECT USING (true);
CREATE POLICY "Public update system_metrics" ON public.system_metrics FOR UPDATE USING (true);

-- ==============================================================================
-- Sample Initial Seed Data
-- ==============================================================================
INSERT INTO public.agents (id, name, specialization, model, status, description, tasks_completed, confidence, temperature)
VALUES 
('agent-secops', 'Sentinel SecOps Auditor', 'Security & Compliance', 'gemini-1.5-pro', 'ready', 'Continuous zero-trust auditing, prompt injection scans, and VPC boundary verification.', 1420, '99.9%', 0.1),
('agent-snowflake', 'Snowflake Financial Analyst', 'Data & Analytics', 'gemini-1.5-flash', 'ready', 'Executes parameterized analytical queries across corporate Snowflake warehouses for real-time telemetry.', 834, '99.4%', 0.2),
('agent-devops', 'Full-Stack Code Sentinel', 'Software Engineering', 'gemini-1.5-pro', 'ready', 'Inspects PRs, analyzes dependency vulnerabilities, and synthesizes automated test suites.', 2105, '99.7%', 0.2),
('agent-onboarding', 'Client Onboarding Specialist', 'Product Operations', 'gemini-1.5-flash', 'ready', 'Synthesizes enterprise customer onboarding SOPs, validates SAML/SSO configs, and updates Salesforce.', 452, '98.9%', 0.4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_metrics (active_agents, total_pool, uptime, guardrail_interceptions, sanitized_tokens, rag_grounding_score, avg_latency_ms, cache_hit_rate, total_requests)
VALUES (4, 16, '99.98%', 4, 1420580, 99.4, 138, 43.5, 18492);
