import {db} from "../db";

export interface Opinion {
    renter_id: Number;
    comment_id: Number;
    opinion: Number;
}