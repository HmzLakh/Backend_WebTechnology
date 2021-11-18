import {db} from "../db";
import {Review} from './review.model';
import { Field } from './field.model';
import { Rating } from './rating.model';

export interface MiniPost {
    post_id: Number;
    title: string;
    name: String;
    image: String;
    rating: number
    sports: Array<String>;
}