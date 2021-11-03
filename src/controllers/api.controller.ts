import * as express from 'express';
import { BaseController } from './base.controller';

export class ApiController extends BaseController {

    constructor() {
        super("/api");
    }

    initializeRoutes(): void {
        // GET /api
        this.router.get("", this.get.bind(this));
    }

	/**
     * GET request for the user controller. Despite being named "get" you can
     * name this function whatever you want (e.g. getUser, ...).
     * 
     * @param {express.Request} req The GET request
     * @param {express.Response} res The response to the request
     */
	 get(req: express.Request, res: express.Response): void {
		res.status(200).json({
			"success": true
		})
	}

    /**
	 * Check if a string is actually provided
	 * 
	 * @param {string} param Provided string
	 * @returns {boolean} Valid or not
	 */
	private _isGiven(param: string): boolean {
		if (param == null)
			return false;
		else
			return param.trim().length > 0;
	}

    /**
	 * Check if a string is a valid email
	 * 
	 * @param {string} email Email string
	 * @returns {boolean} Valid or not
	 */
	private _isEmailValid(email: string): boolean {
		const atIdx = email.indexOf("@");
		const dotIdx = email.indexOf(".");
		
		return atIdx != -1 && dotIdx != -1 && dotIdx > atIdx;
	}
}
