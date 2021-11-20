import * as express from 'express';
import { BaseController } from './base.controller';

export class ApiController extends BaseController {

    constructor() {
        super("/api");
    }

    initializeRoutes(): void {
        // GET /api
        this.router.get("", this.get.bind(this));

		this.router.post("/login", this.login.bind(this))
	 	
    }


	get(req: express.Request, res: express.Response): void {
		res.status(200).json({
			"success": true
		})
	}


	login(req:express.Request,res:express.Response):void{
		//view voor user join renter, en user join owner zou handig zijn!
		var renters = `SELECT * 
		             FROM  User JOIN Renter on User.user_id = Renter.user_id
					 WHERE username = ${req.body.username}` 
		
		var owners = `SELECT *
					 FROM  User JOIN Renter on User.user_id = Owner.user_id
					WHERE username = ${req.body.username}` 
		
		
		//In this case it is a renter
		if (`SELECT COUNT(*) FROM  ${renters}` > 0){
			res.json({
				"renter?": true,
				"owner?"  : false,
				"validpassword?": `EXISTS  
				                  (SELECT * FROM ${renters} 
								   WHERE password = ${req.body.password} })` //todo: convert sql true of falsenaar typecript true of false
			})			
		}
		else if (`SELECT COUNT(*) FROM  ${owners}` > 0){
			res.json({
				"renter?": false,
				"owner?"  : true,
				"validpassword?": `EXISTS  
				                  (SELECT * FROM ${owners} 
								   WHERE password = ${req.body.password} =  })` //todo: convert sql true of falsenaar typescript true of false
			})	

		}
		else {
			res.json({
				"renter?": false,
				"owner?": false,
				"validpassword?": false
			})
		}			
	}

	
	

	/**
     * GET request for the user controller. Despite being named "get" you can
     * name this function whatever you want (e.g. getUser, ...).
     * 
     * @param {express.Request} req The GET request
     * @param {express.Response} res The response to the request
     */
	 

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
