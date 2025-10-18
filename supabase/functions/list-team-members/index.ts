import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing required environment variables");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has permission (admin or editor can view)
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "editor"]);

    if (roleError || !roles || roles.length === 0) {
      console.error("Permission check error:", roleError);
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all team members with their roles
    const { data: members, error: membersError } = await supabase
      .from("user_roles")
      .select(`
        id,
        user_id,
        role,
        created_at,
        profiles:user_id (
          email
        )
      `);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return new Response(JSON.stringify({ error: "Failed to fetch team members" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pending invitations (only for admins)
    const isAdmin = roles.some(r => r.role === "admin");
    let invitations = [];
    
    if (isAdmin) {
      const { data: invites, error: invitesError } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!invitesError) {
        invitations = invites || [];
      }
    }

    console.log(`Fetched ${members?.length || 0} members and ${invitations.length} invitations`);

    return new Response(
      JSON.stringify({ 
        members: members || [],
        invitations 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in list-team-members:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);