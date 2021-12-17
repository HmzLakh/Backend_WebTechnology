import * as express from 'express';
import { db } from '../db';
import { BaseController } from './base.controller';
import * as h from './helpfile';
import * as makepost from './makepost'

const multer = require('multer');

var acceptFile
const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
		acceptFile = true
		cb(null, true)
	}
	else {
		acceptFile = false
		cb(null, false)
	}
}

const upload = multer({
	dest: "static",
	fileFilter: fileFilter
})

export class ApiController extends BaseController {

	constructor() {
		super("/api");
	}


	initializeRoutes(): void {
		// GET /api
		this.router.get("", this.get.bind(this));
		this.router.post("/login", this.login.bind(this))
		this.router.post("/register", this.register.bind(this))
		this.router.get("/profile", this.profile.bind(this));
		this.router.post("/editProfile", this.editProfile.bind(this))
		this.router.post("/test", h.test.bind(this))
		this.router.post("/makePost", makepost.makePost.bind(this))
		this.router.post("/addImagePost", makepost.AddImagePost.bind(this))
		this.router.post("/addField", makepost.addField.bind(this))
		this.router.post("/uploadImage", upload.single('image'), this.uploadImage.bind(this))
	}



	uploadImage(req, res): void {
		console.log(req.file)
		if (acceptFile) {
			db.query(`INSERT INTO Image VALUES ("${req.file.filename}", null)`, //of req.file.path
				(err, result) => {
					if (err) throw err;
					res.json({
						image_id: result.insertID
					})
				})
		}
	}


	get(req: express.Request, res: express.Response): void {
		res.status(200).json({
			"success": true
		})

	}



	login(req: express.Request, res: express.Response): void {
		db.query(`SELECT COUNT(*) as matching_renter
				FROM  User JOIN Renter ON User.user_id = Renter.user_id
				WHERE username = "${req.body.username}" AND password = "${req.body.password}";
				SELECT COUNT(*) as matching_owner
				FROM  User JOIN Owner ON User.user_id = Owner.user_id
		   		WHERE username = "${req.body.username}" AND password = "${req.body.password}"`,
			[1, 2],
			function (err, results) {
				if (err) throw err;
				// `results` is an array with one element for every statement in the query:				
				var is_renter = results[0][0].matching_renter > 0
				var is_owner = results[1][0].matching_owner > 0

				res.json({
					"is_renter": is_renter,
					"is_owner": is_owner
				})

			});
	}

	register_user(firstname, lastname, username, password, email, dateofbirth, is_renter): void {
		db.query(`INSERT INTO User VALUES(NULL,"${username}","${firstname}","${lastname}","${email}", "${password}")`,
			function (error, result) {
				if (error) throw error;

				var user_id = result.insertId;
				console.log(user_id)
				if (is_renter) {
					db.query(`INSERT INTO Renter VALUES(NULL,"${dateofbirth}", "${user_id}")`, (error, result) => { if (error) throw error })
				}
				else {
					db.query(`INSERT INTO Owner VALUES(NULL, "${user_id}"")`, (error, result) => { if (error) throw error })
				}
			})
	}

	register(req: express.Request, res: express.Response): void {
		var is_renter = req.query.is_renter == "true";
		console.log("is het een renter? ", is_renter)
		db.query(`SELECT COUNT(*) as matching_email 
				 FROM user WHERE email = "${req.body.email}";
				 SELECT COUNT(*) as matching_username
				 FROM user WHERE username = "${req.body.username}"`,
			[1, 2],
			(err, results) => {
				if (err) throw err;
				var email_exists = results[0][0].matching_email > 0
				var username_exists = results[1][0].matching_username > 0

				if (!(email_exists || username_exists)) {
					this.register_user(req.body.firstname, req.body.lastname, req.body.username, req.body.password, req.body.email, req.body.dateofbirth, false);
					res.json({
						"succes": true,
						"email_taken": false,
						"username_exists": false
					})
				}
				else {
					res.json({
						"succes": false,
						"email_taken": email_exists,
						"username_exists": username_exists
					})
				}
			})
	}

	// /api/profile[post] (bilal)
	//     in: (username)
	//     out: 
	//     username
	//     first_name
	//     last_name
	//     email
	//     dateofbirth: NULL if it is a owner

	profile(req: express.Request, res: express.Response): void {
		db.query(`SELECT * FROM User JOIN Renter ON User.user_id = Renter.user_id WHERE username = "${req.body.username}" ;
				  SELECT * FROM User JOIN Owner  ON User.user_id = Owner.user_id WHERE username = "${req.body.username}"`,
			[1, 2],
			(err, results) => {
				if (err) throw err;
				var matching_renter = results[0][0]
				var matching_owner = results[1][0]
				var is_renter = matching_renter != null
				var wrong_username = matching_renter == null && matching_owner == null
				var table = is_renter ? matching_renter : matching_owner
				res.json({
					"username": wrong_username ? null : table.username,
					"first_name": wrong_username ? null : table.first_name,
					"last_name": wrong_username ? null : table.last_name,
					"email": wrong_username ? null : table.last_name,
					"dateofbirth": is_renter ? table.age : null
				})


			})
	}



	actually_edit_profile(req: express.Request, res: express.Response, is_renter): void {
		var update_renter = is_renter && !(req.body.new_dateofbirth === "false");
		db.query(`WITH temp AS (SELECT * FROM USER ) 
					  UPDATE USER SET
					  ${req.body.new_first_name === "false" ? `first_name = (SELECT first_name from temp where username = "${req.body.username}"),`
				: `first_name = "${req.body.new_first_name}",`}
					 
					  ${req.body.new_last_name === "false" ? `last_name = (SELECT last_name  from temp where username = "${req.body.username}"),`
				: `last_name = "${req.body.new_last_name}",`}
					 
					  ${req.body.new_email === "false" ? `email = (SELECT email from temp  where username = "${req.body.username}"),`
				: `email = "${req.body.new_email}",`}
					 
					  ${req.body.new_password === "false" ? `password = (SELECT password from temp where username = "${req.body.username}")`
				: `password   = "${req.body.new_password}"`}

					where user_id = (SELECT user_id FROM temp where username = "${req.body.username}")`,
			(err, results) => {
				if (err) throw err;
				if (!update_renter) {
					res.json({
						"email_already_exists": false,
						"success": true
					})
				}
			})

		if (update_renter) {
			db.query(`
				UPDATE RENTER SET age = ${req.body.new_dateofbirth} where user_id = (SELECT user_id from user where username = "${req.body.username}")`,
				(err, results) => {
					if (err) throw err;
					res.json({ "email_already_exists": false, "succes": true })
				})

		}
	}

	//first check if new email already in use, 
	editProfile(req: express.Request, res: express.Response): void {
		db.query(
			`SELECT COUNT(*) as matching_email FROM user WHERE email = "${req.body.new_email}";
				SELECT COUNT(*) as matching_renter
				FROM  User JOIN Renter ON User.user_id = Renter.user_id
				WHERE username = "${req.body.username}"`,
			[1, 2],
			(err, result) => {
				if (err) throw err;
				var matching_email = result[0][0].matching_email;
				var is_renter = result[1][0].matching_renter;

				if (matching_email > 0) {
					res.json({
						"email_already_exists": true,
						"succes": false

					})
				}
				else this.actually_edit_profile(req, res, is_renter);

			})
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
