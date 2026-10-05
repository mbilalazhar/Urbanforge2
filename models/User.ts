import "server-only";
import { ObjectId } from "mongodb";
import dbConnect from "@/lib/dbconnect";
import { defaultProfileImage, emptyUserDetails, type UserProfile, type UserProfileUpdate } from "@/lib/user-profile";
import { createAccountModel, type AccountDocument, type AccountSession } from "./account";

const account = createAccountModel("users", "user");
const profileProjection = { profileImage: 1, wishlistProductIds: 1, _id: 1, name: 1, email: 1, contact: 1, defaultAddress: 1, currentOrderIds: 1, pastOrderIds: 1, preferences: 1 };

async function initializeDetails(id: ObjectId) {
  const defaults = emptyUserDetails();
  const db = await dbConnect();
  // Initialize legacy accounts without replacing any saved contact/address/order data.
  await db.collection<AccountDocument>("users").updateOne({ _id: id }, [{
    $set: Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { $ifNull: [`$${key}`, { $literal: value }] }])),
  }]);
}
function toProfile(document: AccountDocument): UserProfile {
  return {
    id: document._id.toHexString(), name: document.name, email: document.email,
    profileImage: document.profileImage ?? defaultProfileImage,
    contact: document.contact ?? "", wishlistProductIds: document.wishlistProductIds ?? [], defaultAddress: document.defaultAddress ?? null,
    currentOrderIds: document.currentOrderIds ?? [], pastOrderIds: document.pastOrderIds ?? [],
    preferences: document.preferences ?? { orders: true, news: false },
  };
}
const User = {
  ...account,
  async addSession(id: ObjectId, session: AccountSession) {
    await initializeDetails(id);
    return account.addSession(id, session);
  },
  async findBySession(tokenHash: string) {
    const document = await account.findBySession(tokenHash);
    if (document && Object.keys(emptyUserDetails()).some(key => !(key in document))) await initializeDetails(document._id);
    return document;
  },
  async getWishlist(id: string) {
    const db = await dbConnect();
    const user = await db.collection<AccountDocument>("users").findOne({ _id: new ObjectId(id) }, { projection: { wishlistProductIds: 1 } });
    return user ? user.wishlistProductIds ?? [] : null;
  },
  async setWishlistProduct(id: string, productId: string, saved: boolean) {
    const db = await dbConnect();
    const user = await db.collection<AccountDocument>("users").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { ...(saved ? { $addToSet: { wishlistProductIds: productId } } : { $pull: { wishlistProductIds: productId } }), $set: { updatedAt: new Date() } },
      { returnDocument: "after", projection: { wishlistProductIds: 1 } },
    );
    return user ? user.wishlistProductIds ?? [] : null;
  },
  async getProfile(id: string) {
    const db = await dbConnect();
    const document = await db.collection<AccountDocument>("users").findOne({ _id: new ObjectId(id) }, { projection: profileProjection });
    return document ? toProfile(document) : null;
  },
  async updateProfile(id: string, input: UserProfileUpdate) {
    const db = await dbConnect();
    const document = await db.collection<AccountDocument>("users").findOneAndUpdate(
      { _id: new ObjectId(id) }, { $set: { ...input, updatedAt: new Date() } },
      { returnDocument: "after", projection: profileProjection },
    );
    return document ? toProfile(document) : null;
  },
};
export default User;
