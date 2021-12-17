"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express = require("express");
const session = require("express-session");
const api_controller_1 = require("./controllers/api.controller");
const path = require("path");
class App {
    constructor() {
        this.port = 5555;
        this.controllers = new Map();
        this.path = "";
        this.app = express();
        this._initializeMiddleware();
        this._initializeControllers();
        this.listen();
    }
    _initializeControllers() {
        // Controllers here
        this.addController(new api_controller_1.ApiController());
        // We link the router of each controller to our server
        this.controllers.forEach(controller => {
            this.app.use(`${this.path}${controller.path}`, controller.router);
        });
    }
    addController(controller) {
        this.controllers.set(controller.constructor.name, controller);
    }
    _initializeMiddleware() {
        this.app.use(session({
            secret: 'SecretPassword',
            resave: true,
            saveUninitialized: true
        }));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(__dirname, "../static"))); // Location for frontend
    }
    listen() {
        this.app.listen(this.port, () => {
            console.log(`App listening on http://localhost:${this.port}`);
        });
    }
}
exports.App = App;
exports.default = new App();
//# sourceMappingURL=app.js.map