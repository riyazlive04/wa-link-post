-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update the handle_new_user_credits function to assign roles
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert 5 free credits for new user
  INSERT INTO public.user_credits (user_id, total_credits, source)
  VALUES (NEW.id, 5, 'free');
  
  -- Assign role based on email
  IF NEW.email = 'riyaz.livechat@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update get_available_credits to handle admin users
CREATE OR REPLACE FUNCTION public.get_available_credits(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN public.has_role(user_uuid, 'admin') THEN 999999
    ELSE COALESCE(SUM(total_credits - used_credits), 0)
  END
  FROM public.user_credits 
  WHERE user_id = user_uuid;
$$;

-- Update deduct_credit to handle admin users
CREATE OR REPLACE FUNCTION public.deduct_credit(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_credits INTEGER;
  credit_record RECORD;
BEGIN
  -- Admins have unlimited credits
  IF public.has_role(user_uuid, 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Get available credits for regular users
  SELECT public.get_available_credits(user_uuid) INTO available_credits;
  
  -- Check if user has credits
  IF available_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Find the oldest credit record with available credits
  SELECT * INTO credit_record
  FROM public.user_credits 
  WHERE user_id = user_uuid 
    AND (total_credits - used_credits) > 0
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Update the credit record
  UPDATE public.user_credits 
  SET used_credits = used_credits + 1,
      updated_at = now()
  WHERE id = credit_record.id;
  
  RETURN TRUE;
END;
$$;