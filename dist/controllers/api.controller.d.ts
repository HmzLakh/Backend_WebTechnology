import * as express from 'express';
import { BaseController } from './base.controller';
export declare class ApiController extends BaseController {
    constructor();
    initializeRoutes(): void;
    /**
     * GET request for the user controller. Despite being named "get" you can
     * name this function whatever you want (e.g. getUser, ...).
     *
     * @param {express.Request} req The GET request
     * @param {express.Response} res The response to the request
     */
    get(req: express.Request, res: express.Response): void;
    /**
     * Check if a string is actually provided
     *
     * @param {string} param Provided string
     * @returns {boolean} Valid or not
     */
    private _isGiven;
    /**
     * Check if a string is a valid email
     *
     * @param {string} email Email string
     * @returns {boolean} Valid or not
     */
    private _isEmailValid;
}
