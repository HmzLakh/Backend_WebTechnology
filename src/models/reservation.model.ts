import {db} from "../db";

export interface Reservation {

    reservation_id: Number;
    renter_id: Number;
    owner_id: Number;
    post_id: Number;
    field_id: Number;
    date: Number;
    time: Number;
    post_name: String;
    field_name: String;
}