import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: "reader" | "editor" | "admin";
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseKey || !resendApiKey) {
      throw new Error("Missing required environment variables");
    }

    // Get authorization header
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

    // Parse request body
    const { email, role, message }: InvitationRequest = await req.json();

    // Validate input
    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Create invitation in database
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .insert({
        email,
        role,
        message,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Invitation creation error:", inviteError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const inviterEmail = profile?.email || "team@neurika.ai";
    const invitationLink = `${req.headers.get("origin")}/auth?invite=${token}`;

    // Send invitation email via Resend
    const resend = new Resend(resendApiKey);
    
    const roleDescriptions = {
      reader: "View only access",
      editor: "Can edit and comment",
      admin: "Full access"
    };

    const emailHtml = `
      <h1>You've been invited to join Neurika</h1>
      <p>Hello!</p>
      <p>${inviterEmail} has invited you to join their Neurika team as a <strong>${role}</strong> (${roleDescriptions[role]}).</p>
      ${message ? `<p><strong>Personal message:</strong><br/>${message}</p>` : ''}
      <p>Click the link below to accept the invitation:</p>
      <a href="${invitationLink}" style="display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Accept Invitation</a>
      <p>Or copy and paste this link into your browser:<br/>${invitationLink}</p>
      <p>This invitation will expire in 7 days.</p>
      <p>Best regards,<br/>The Neurika Team</p>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "Neurika <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to join Neurika",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the request if email fails - invitation is still created
    } else {
      console.log("Invitation email sent successfully to:", email);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation,
        message: "Invitation sent successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-team-invitation:", error);
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