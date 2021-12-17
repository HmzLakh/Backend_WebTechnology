import * as express from 'express';
import { BaseController } from "./controllers/base.controller";
export declare class App {
    app: express.Application;
    port: number;
    controllers: Map<string, BaseController>;
    path: string;
    constructor();
    private _initializeControllers;
    addController(controller: BaseController): void;
    private _initializeMiddleware;
    listen(): void;
}
declare const _default: App;
export default _default;
