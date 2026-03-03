import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Redirect, useLocation } from "wouter";
import { SiThemoviedatabase } from "react-icons/si";
import { MailCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type RegisterData = InsertUser & { email?: string };

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  // Check for ?verified=1 in URL
  const isJustVerified = location.includes("verified=1");

  const loginForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "", email: "", avatarUrl: "" },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/resend-verification", {});
      return res.json();
    },
    onSuccess: () => toast({ title: "Verification email resent!" }),
    onError: () => toast({ title: "Failed to resend email", variant: "destructive" }),
  });

  if (user) {
    return <Redirect to="/" />;
  }

  function handleRegister(data: RegisterData) {
    registerMutation.mutate(data, {
      onSuccess: (result: any) => {
        if (result.emailSent && data.email) {
          setRegisteredEmail(data.email);
        }
      },
    });
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">

          {/* Just verified banner */}
          {isJustVerified && (
            <Alert className="border-green-500/40 bg-green-950/30">
              <MailCheck className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">
                Email verified! You're all set 🎉
              </AlertDescription>
            </Alert>
          )}

          {/* Post-registration check-email banner */}
          {registeredEmail && (
            <Alert className="border-blue-500/40 bg-blue-950/30">
              <MailCheck className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 space-y-2">
                <p>We sent a verification link to <strong>{registeredEmail}</strong></p>
                <p className="text-xs text-muted-foreground">
                  You're logged in, but some features require a verified email.
                </p>
                <Button size="sm" variant="outline" className="mt-1"
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}>
                  Resend email
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login tab */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField control={loginForm.control} name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={loginForm.control} name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {loginMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Invalid username or password</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Logging in…" : "Login"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Register tab */}
            <TabsContent value="register">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(handleRegister)}
                  className="space-y-4"
                >
                  <FormField control={registerForm.control} name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={registerForm.control} name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={registerForm.control} name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <span className="text-muted-foreground font-normal">(optional — for verification)</span></FormLabel>
                        <FormControl><Input type="email" placeholder="you@example.com" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={registerForm.control} name="avatarUrl"
                    render={({ field: { value, ...field } }) => (
                      <FormItem>
                        <FormLabel>Avatar URL <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl><Input {...field} value={value ?? ""} placeholder="https://..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {registerMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {(registerMutation.error as any)?.message ?? "Registration failed"}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "Creating account…" : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-gradient-to-br from-primary/20 to-primary/10 p-8 hidden lg:flex items-center justify-center">
        <div className="max-w-md text-center">
          <SiThemoviedatabase className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Welcome to CozyWatch
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your favorite movies, shows, and anime in one cozy place.
          </p>
        </div>
      </div>
    </div>
  );
}
