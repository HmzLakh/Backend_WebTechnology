import * as express from 'express';

export abstract class BaseController {
    router = express.Router();
    path = "/";

    constructor(path: string) {
        this.path = path;
        this.initializeRoutes();
    }
    abstract initializeRoutes();
}