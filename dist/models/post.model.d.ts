import { Comment } from './comment.model';
import { Field } from './field.model';
import { Rating } from './rating.model';
export interface Post {
    post_id: Number;
    owner_id: Number;
    name: String;
    address: String;
    information: String;
    fields: Array<Field>;
    rating: Array<Rating>;
    comments: Array<Comment>;
}
