-- Create user_credits table to track credit balances
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('free', 'purchase', 'adjustment')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, source) -- Allow one free credit entry per user
);

-- Create payment_history table to track all payments
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (paise for INR, cents for USD)
  currency TEXT NOT NULL DEFAULT 'INR',
  credits_purchased INTEGER NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on both tables
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_credits
CREATE POLICY "Users can view their own credits" ON public.user_credits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own credits" ON public.user_credits
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own credits" ON public.user_credits
  FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for payment_history
CREATE POLICY "Users can view their own payment history" ON public.payment_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert payment records" ON public.payment_history
  FOR INSERT WITH CHECK (true); -- Allow edge functions to insert

CREATE POLICY "System can update payment records" ON public.payment_history
  FOR UPDATE USING (true); -- Allow edge functions to update

-- Function to get available credits for a user
CREATE OR REPLACE FUNCTION public.get_available_credits(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(total_credits - used_credits), 0)
  FROM public.user_credits 
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Function to deduct credits for a user
CREATE OR REPLACE FUNCTION public.deduct_credit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  available_credits INTEGER;
  credit_record RECORD;
BEGIN
  -- Get available credits
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to add credits to a user
CREATE OR REPLACE FUNCTION public.add_credits(
  user_uuid UUID, 
  credits INTEGER, 
  credit_source TEXT DEFAULT 'purchase'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, total_credits, source)
  VALUES (user_uuid, credits, credit_source)
  ON CONFLICT (user_id, source) 
  DO UPDATE SET 
    total_credits = user_credits.total_credits + credits,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to give new users 5 free credits automatically
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert 5 free credits for new user
  INSERT INTO public.user_credits (user_id, total_credits, source)
  VALUES (NEW.id, 5, 'free');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Add updated_at trigger for user_credits
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for payment_history
CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON public.payment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();