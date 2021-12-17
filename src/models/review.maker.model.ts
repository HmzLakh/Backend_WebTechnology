import {db} from "../db";
import { Opinion } from './opinion.model';

export interface ReviewMaker {
    post_id: Number;
    review_id: Number;
    username: String;
    user_image: String;
    date_time: String;
    content: String;
    rating: Number;
    votes: Number;
}