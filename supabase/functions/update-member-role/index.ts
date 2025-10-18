import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateRoleRequest {
  memberId: string;
  newRole: "reader" | "editor" | "admin";
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

    const { memberId, newRole }: UpdateRoleRequest = await req.json();

    if (!memberId || !newRole) {
      return new Response(JSON.stringify({ error: "memberId and newRole are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-demotion (admins can't remove their own admin role)
    const { data: targetMember } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("id", memberId)
      .single();

    if (targetMember?.user_id === user.id && targetMember?.role === "admin" && newRole !== "admin") {
      return new Response(JSON.stringify({ error: "You cannot remove your own admin role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the role
    const { data: updated, error: updateError } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", memberId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating role:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Updated role for member ${memberId} to ${newRole}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        member: updated,
        message: "Role updated successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in update-member-role:", error);
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