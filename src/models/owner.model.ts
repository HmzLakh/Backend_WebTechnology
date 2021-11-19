import {db} from "../db";

export interface Owner {
    user_id: Number;
    owner_id: Number;
    first_name: String;
    last_name: String;
    username: String;
    email: String;
    password: String;
}