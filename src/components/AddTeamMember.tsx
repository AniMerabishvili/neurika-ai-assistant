import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const teamMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  role: z.enum(["reader", "editor", "admin"], {
    required_error: "Please select a role",
  }),
  message: z
    .string()
    .trim()
    .max(500, { message: "Message must be less than 500 characters" })
    .optional(),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

export default function AddTeamMember() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      email: "",
      role: undefined,
      message: "",
    },
  });

  const onSubmit = async (data: TeamMemberFormValues) => {
    setIsSubmitting(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { error } = await supabase.functions.invoke("send-team-invitation", {
        body: {
          email: data.email,
          role: data.role,
          message: data.message,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${data.email}`,
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error("Invitation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-gray-800 font-semibold">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member. They will receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="teammate@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover">
                      <SelectItem value="reader">Reader - View only access</SelectItem>
                      <SelectItem value="editor">Editor - Can edit and comment</SelectItem>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal note to the invitation..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setOpen(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gradient-primary text-gray-800 font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
