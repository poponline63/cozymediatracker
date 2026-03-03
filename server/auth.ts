import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { sendVerificationEmail } from "./email";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID ?? process.env.SESSION_SECRET ?? "cozywatch-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      }
      return done(null, user);
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // ---- Register ----
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, avatarUrl } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check username uniqueness
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Check email uniqueness
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        email: email ?? null,
        emailVerified: !email, // auto-verify if no email provided
        avatarUrl: avatarUrl ?? null,
      });

      // Send verification email if provided
      if (email) {
        try {
          const token = generateToken();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
          await storage.createVerificationToken(user.id, token, expiresAt);
          await sendVerificationEmail(email, username, token);
        } catch (emailErr) {
          // Non-fatal — user can request resend
          console.error("Failed to send verification email:", emailErr);
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          ...user,
          emailSent: !!email,
        });
      });
    } catch (err) {
      next(err);
    }
  });

  // ---- Login ----
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  // ---- Logout ----
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // ---- Get current user ----
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // ---- Verify email ----
  app.get("/api/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const record = await storage.getVerificationToken(token);
    if (!record) {
      return res.status(400).json({ message: "Token not found or already used" });
    }

    if (new Date() > record.expiresAt) {
      await storage.deleteVerificationToken(record.id);
      return res.status(400).json({ message: "Token expired. Please request a new verification email." });
    }

    await storage.markEmailVerified(record.userId);
    await storage.deleteVerificationToken(record.id);

    // If user is already logged in, refresh session
    if (req.isAuthenticated() && req.user!.id === record.userId) {
      const updated = await storage.getUser(record.userId);
      if (updated) {
        req.login(updated, () => {});
      }
    }

    // Redirect to app with success flag
    res.redirect("/?verified=1");
  });

  // ---- Resend verification email ----
  app.post("/api/resend-verification", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }
    if (!user.email) {
      return res.status(400).json({ message: "No email address on file" });
    }

    try {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createVerificationToken(user.id, token, expiresAt);
      await sendVerificationEmail(user.email, user.username, token);
      res.json({ message: "Verification email sent" });
    } catch (err) {
      res.status(500).json({ message: "Failed to send email" });
    }
  });
}
