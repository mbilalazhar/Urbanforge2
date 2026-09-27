import "server-only";
import { createAccountModel } from "./account";

const User = createAccountModel("users", "user");
export default User;
