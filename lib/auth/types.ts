export type AccountRole = "user" | "admin";

export type PublicAccount = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
};

export type SessionResponse = { account: PublicAccount | null };
export type LoginInput = { email: string; password: string };
export type SignupInput = LoginInput & { name: string };
