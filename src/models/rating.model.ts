import {db} from "../db";

export interface Rating {
    post_id: Number;
    renter_id: Number;
    rating: Number;
}
