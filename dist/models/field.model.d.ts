import { Opinion } from './opinion.model';
export interface Field {
    field_id: Number;
    post_id: Number;
    name: String;
    price: Number;
    max_number_of_persons: Number;
    opinions: Array<Opinion>;
    sports: Array<String>;
}
