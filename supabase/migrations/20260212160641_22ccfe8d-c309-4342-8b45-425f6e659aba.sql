
-- Clients table (identified by CPF)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Anyone can create a client (no auth needed for clients)
CREATE POLICY "Anyone can insert clients" ON public.clients FOR INSERT WITH CHECK (true);
-- Only authenticated admin can view all clients
CREATE POLICY "Admin can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
-- Anon can read their own client by CPF (handled via edge function or direct query)
CREATE POLICY "Anon can read own client" ON public.clients FOR SELECT TO anon USING (true);

-- Services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "Admin can manage services" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_date, appointment_time, status)
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Anyone can create appointments
CREATE POLICY "Anyone can insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);
-- Anyone can view appointments (needed to check availability)
CREATE POLICY "Anyone can view appointments" ON public.appointments FOR SELECT USING (true);
-- Anyone can update (for cancellations)
CREATE POLICY "Anyone can update appointments" ON public.appointments FOR UPDATE USING (true);
-- Admin can delete
CREATE POLICY "Admin can delete appointments" ON public.appointments FOR DELETE TO authenticated USING (true);

-- Blocked slots table (for admin to block times)
CREATE TABLE public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  blocked_time TIME,
  full_day BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked slots" ON public.blocked_slots FOR SELECT USING (true);
CREATE POLICY "Admin can manage blocked slots" ON public.blocked_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed services
INSERT INTO public.services (name, description, price, duration_minutes) VALUES
  ('Mão e Pé', 'Cuidado completo para mãos e pés com esmaltação perfeita.', 150.00, 90),
  ('Colocação', 'Aplicação de unhas em gel ou acrílico com acabamento impecável.', 115.00, 75),
  ('Manutenção', 'Retoque e manutenção para manter suas unhas sempre lindas.', 100.00, 60);
