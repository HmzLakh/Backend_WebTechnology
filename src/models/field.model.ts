import {db} from "../db";

export interface Field {
    field_id: Number;
    post_id: Number;
    name: String;
    price: Number;
    max_number_of_persons: Number;
    sports: Array<String>;
}