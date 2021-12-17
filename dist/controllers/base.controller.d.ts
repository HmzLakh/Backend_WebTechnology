export declare abstract class BaseController {
    router: import("express-serve-static-core").Router;
    path: string;
    constructor(path: string);
    abstract initializeRoutes(): any;
}
