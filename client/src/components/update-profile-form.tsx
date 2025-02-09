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
  username: z.string().min(3, "Username must be at least 3 characters"),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
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
        throw new Error("Failed to update profile");
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
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
                Enter a URL for your profile picture
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
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>
                Leave blank to keep current password
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Update Profile
        </Button>
      </form>
    </Form>
  );
}
