import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RemoveMemberRequest {
  memberId: string;
}

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

    // Check if user is admin
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roles) {
      console.error("Permission check error:", roleError);
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { memberId }: RemoveMemberRequest = await req.json();

    if (!memberId) {
      return new Response(JSON.stringify({ error: "memberId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-removal
    const { data: targetMember } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("id", memberId)
      .single();

    if (targetMember?.user_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot remove yourself from the team" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is the last admin
    if (targetMember) {
      const { data: adminCount } = await supabase
        .from("user_roles")
        .select("id", { count: "exact" })
        .eq("role", "admin");

      if (adminCount && adminCount.length <= 1) {
        const { data: isTargetAdmin } = await supabase
          .from("user_roles")
          .select("role")
          .eq("id", memberId)
          .eq("role", "admin")
          .maybeSingle();

        if (isTargetAdmin) {
          return new Response(JSON.stringify({ error: "Cannot remove the last admin" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Remove all roles for this user
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      console.error("Error removing member:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to remove team member" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Removed member ${memberId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Team member removed successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in remove-team-member:", error);
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