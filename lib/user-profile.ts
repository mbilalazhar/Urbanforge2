export type UserAddress = {
  recipient: string;
  contact: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};
export type UserDetails = {
  contact: string;
  wishlistProductIds: string[];
  defaultAddress: UserAddress | null;
  /** References to order IDs; maintained by checkout and fulfilment, never by profile edits. */
  currentOrderIds: string[];
  pastOrderIds: string[];
  preferences: { orders: boolean; news: boolean };
};
export type UserProfile = UserDetails & { id: string; name: string; email: string };
export type UserProfileUpdate = Partial<Pick<UserProfile, "name" | "contact" | "defaultAddress" | "preferences">>;
export const emptyUserDetails = (): UserDetails => ({
  contact: "", wishlistProductIds: [], defaultAddress: null, currentOrderIds: [], pastOrderIds: [],
  preferences: { orders: true, news: false },
});
