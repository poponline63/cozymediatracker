import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  avatarUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

interface UpdateProfileFormProps {
  defaultValues: {
    username: string;
    avatarUrl?: string;
  };
  onSuccess?: () => void;
}

export function UpdateProfileForm({ defaultValues, onSuccess }: UpdateProfileFormProps) {
  const { toast } = useToast();
  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: defaultValues.username,
      avatarUrl: defaultValues.avatarUrl || "",
      password: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileValues) => {
      const cleanedData = {
        ...data,
        password: data.password || undefined,
        avatarUrl: data.avatarUrl || undefined,
      };
      const res = await apiRequest("PATCH", "/api/user", cleanedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      onSuccess?.();
      form.reset(form.getValues()); // Reset form state but keep values
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: UpdateProfileValues) {
    updateProfileMutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name. Only letters, numbers, and underscores allowed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://example.com/avatar.png" />
              </FormControl>
              <FormDescription>
                Enter a URL for your profile picture (leave empty to remove)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  {...field} 
                  autoComplete="new-password"
                />
              </FormControl>
              <FormDescription>
                Leave blank to keep current password
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={updateProfileMutation.isPending || !form.formState.isDirty}
          className="w-full"
        >
          {updateProfileMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Update Profile
        </Button>
      </form>
    </Form>
  );
}