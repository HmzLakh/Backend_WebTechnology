import "express-session";
import { UserInfo } from "../../models/userinfo.model";

declare module "express-session" {
    interface SessionData {
        userInfo: UserInfo;
    }
}