import {db} from "../db";

export interface Renter {
    user_id: Number;
    renter_id: Number;
    username: String;
    first_name: String;
    last_name: String;
    email: String;
    password: String;
    date_of_birth: String;
}