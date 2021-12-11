import {db} from "../db";
import {Review} from './review.model';
import { Field } from './field.model';

export interface Post {
    post_id: Number;
    name: string;
    images: Array<String>;
    address: String;
    description: String;
    sports: Array<String>;
    rating: number;
    reviews: Array<Review>;
    fields: Array<Field>;
} 