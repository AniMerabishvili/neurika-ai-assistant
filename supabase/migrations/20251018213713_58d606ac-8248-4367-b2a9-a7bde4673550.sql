-- Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('reader', 'editor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for role-based access control
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
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

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  message TEXT,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for team_invitations
CREATE POLICY "Admins and editors can view all invitations"
  ON public.team_invitations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Admins can create invitations"
  ON public.team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitations"
  ON public.team_invitations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations"
  ON public.team_invitations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_invitation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic timestamp updates on team_invitations
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invitation_timestamp();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);