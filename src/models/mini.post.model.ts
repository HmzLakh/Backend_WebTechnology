import {db} from "../db";
import {Review} from './review.model';
import { Field } from './field.model';
import { Rating } from './rating.model';

export interface MiniPost {
    post_id: Number;
    owner_id: Number;
    title: string;
    username: String;
    rating: number
    sports: Array<String>;
    image: String;
    min_price: Number;
    max_price: Number;
}