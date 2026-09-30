import "server-only";

import { ObjectId, type Collection } from "mongodb";
import { emptyUserDetails, type UserDetails } from "@/lib/user-profile";
import dbConnect from "@/lib/dbconnect";
import type { AccountRole, PublicAccount } from "@/lib/auth/types";

export type AccountSession = { tokenHash: string; expiresAt: Date };
export type AccountDocument = Partial<UserDetails> & {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  sessions: AccountSession[];
  createdAt: Date;
  updatedAt: Date;
};

export function createAccountModel(collectionName: "users" | "admins", role: AccountRole) {
  let pendingCollection: Promise<Collection<AccountDocument>> | undefined;

  function collection() {
    if (!pendingCollection) {
      pendingCollection = (async () => {
        const db = await dbConnect();
        const accounts = db.collection<AccountDocument>(collectionName);
        await accounts.createIndex({ email: 1 }, { unique: true });
        await accounts.createIndex({ "sessions.tokenHash": 1 });
        return accounts;
      })().catch((error: unknown) => {
        pendingCollection = undefined;
        throw error;
      });
    }
    return pendingCollection;
  }

  return {
    async create(input: { name: string; email: string; passwordHash: string }, session?: AccountSession) {
      const now = new Date();
      const account: AccountDocument = {
        ...(role === "user" ? emptyUserDetails() : {}),
        _id: new ObjectId(),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        sessions: session ? [session] : [],
        createdAt: now,
        updatedAt: now,
      };
      await (await collection()).insertOne(account);
      return account;
    },
    async findByEmail(email: string) {
      return (await collection()).findOne({ email: email.trim().toLowerCase() });
    },
    async findBySession(tokenHash: string) {
      return (await collection()).findOne({
        sessions: { $elemMatch: { tokenHash, expiresAt: { $gt: new Date() } } },
      }, { projection: { passwordHash: 0, sessions: 0 } });
    },
    async addSession(id: ObjectId, session: AccountSession) {
      // Bound stored sessions and allow up to five signed-in devices per account.
      await (await collection()).updateOne({ _id: id }, {
        $push: { sessions: { $each: [session], $slice: -5 } },
        $set: { updatedAt: new Date() },
      });
    },
    async removeSession(tokenHash: string) {
      await (await collection()).updateOne({ "sessions.tokenHash": tokenHash }, {
        $pull: { sessions: { tokenHash } },
      });
    },
    toPublic(account: Pick<AccountDocument, "_id" | "name" | "email">): PublicAccount {
      return { id: account._id.toHexString(), name: account.name, email: account.email, role };
    },
  };
}
