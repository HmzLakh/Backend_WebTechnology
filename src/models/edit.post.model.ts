import {db} from "../db";
import {Review} from './review.model';
import { Field } from './field.model';
import { Rating } from './rating.model';

export interface Post {
    post_id: Number;
    title: string;
    images: Array<String>;
    address: String;
    description: String;
    fields: Array<Field>;
    sports: Array<String>;
}