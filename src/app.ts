import * as express from 'express';
import * as session from 'express-session';
import { BaseController } from "./controllers/base.controller";
import { ApiController } from "./controllers/api.controller";
import * as path from 'path';

export class App {
    app: express.Application;
    port: number = 5555;
    controllers: Map<string, BaseController> = new Map();
    path: string = "";

    constructor() {
        this.app = express();
        this._initializeMiddleware();
        this._initializeControllers();
        this.listen();
    }

    private _initializeControllers(): void {
        // Controllers here
        this.addController(new ApiController())

        // We link the router of each controller to our server
        this.controllers.forEach(controller => {
            this.app.use(`${this.path}${controller.path}`, controller.router);
        });
    }

    public addController(controller: BaseController): void {
        this.controllers.set(controller.constructor.name, controller);
    }

    private _initializeMiddleware(): void {
        this.app.use(session({ 
            secret: 'SecretPassword',
            resave: true,
            saveUninitialized: true
        }));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(__dirname, "../static"))); // Location for frontend
    }

    public listen() {
        this.app.listen(this.port, () => {
            console.log(`App listening on http://localhost:${this.port}`);
        });
    }

}
export default new App();