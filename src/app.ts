import * as express from 'express';
import * as session from 'express-session';
import * as cors from 'cors';
import * as fileUpload from 'express-fileupload';

import { BaseController } from "./controllers/base.controller";
import { ApiController } from "./controllers/api.controller";
import { PublicController } from "./controllers/public.controller"
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
        this.addController(new PublicController())
        // We link the router of each controller to our server
        this.controllers.forEach(controller => {
            this.app.use(`${this.path}${controller.path}`, controller.router);
        });
    }

    public addController(controller: BaseController): void {
        this.controllers.set(controller.constructor.name, controller);
    }

    private _initializeMiddleware(): void {
        this.app.use(session({ // Express session, used to hold a session between client and server
            secret: 'SecretPassword',
            resave: false,
            saveUninitialized: true
        }));
        this.app.use(cors({credentials: true, origin: 'http://localhost:8080'})); // Cors in order to make requests
        this.app.use(express.urlencoded({ extended: true })); // Bodyparser in order to decode body
        this.app.use(express.static(path.join(__dirname, "../static"))); // Location for frontend that is served statically
        this.app.use(fileUpload({ // Plugin to let express use formdata body
            createParentPath: true
        }));
    }

    public listen() {
        this.app.listen(this.port, () => {
            console.log(`App listening on http://localhost:${this.port}`);
        });
    }

}
export default new App();