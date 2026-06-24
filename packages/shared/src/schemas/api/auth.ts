import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    currency: z.string(),
    timezone: z.string()
  })
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
