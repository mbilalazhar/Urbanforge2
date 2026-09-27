import "server-only";
import { createAccountModel } from "./account";

const Admin = createAccountModel("admins", "admin");
export default Admin;
