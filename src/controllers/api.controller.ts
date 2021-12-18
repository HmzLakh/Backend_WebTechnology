import * as express from 'express';
import { db } from '../db';
import { BaseController } from './base.controller';
import * as h from './helpfile';
import * as makepost from './makepost'


import { Post } from '../models/post.model';
import { MiniPost } from '../models/mini.post.model';
import { Reservation } from '../models/reservation.model';
import bodyParser = require('body-parser');


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

		this.router.get("/getPost/:post_id", this.getPost.bind(this));
        this.router.get("/getPosts", this.getPosts.bind(this));
        this.router.put("/editPost", this.editPost.bind(this));
        this.router.put("/editFields", this.editPost.bind(this));
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

	// Hamza edited
	// Route is ok, need only form validation
	// Adding succes in order to stay consistent and know when to read errorMsg
	// TODO ==> send json result when error occur? (empty username or password)
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
					"success": (is_renter || is_owner),
					"is_renter": is_renter,
					"is_owner": is_owner,
					'errorMsg': (req.body.username === "" ? "username field empty" : "") + (req.body.password === "" ? " password field empty" : "") 
				})
			});
		}

	register_user(firstname, lastname, username, password, email, dateofbirth, is_renter, res): void {
		const password_min_length = 8
		if(password.length < password_min_length ||  !this._isEmailValid(email)){
			res.json({
				"succes": false,
				"email_taken": false,
				"username_exists": false,
				"password_valid": password.length > password_min_length,
				"email_valid": this._isEmailValid(email)				
			})
		}
		else{
		db.query(`INSERT INTO User VALUES(NULL,"${username}","${firstname}","${lastname}","${email}", "${password}")`,
			function (error, result) {
				if (error) throw error;

				var user_id = result.insertId;
				console.log(user_id)
				if (is_renter) {
					db.query(`INSERT INTO Renter VALUES(NULL,"${dateofbirth}", ${user_id})`, (error, result) => { if (error) throw error })
				}
				else {
					db.query(`INSERT INTO Owner VALUES(NULL, ${user_id})`, (error, result) => { if (error) throw error })
				}

				res.json({
					"succes": true,
					"email_taken": false,
					"username_exists": false,
					"password_valid": true,
					"email_valid": true
				})
			})		
		}
	}

	// Hamza edit
	// Error when registering for first time
	// TODO Need to fix this!
	register(req: express.Request, res: express.Response): void {
		var is_renter = req.body.is_renter === "true";
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
					this.register_user(req.body.firstname, req.body.lastname, req.body.username, req.body.password, req.body.email, req.body.dateofbirth, is_renter, res);
				}
				else {
					res.json({
						"succes": false,
						"email_taken": email_exists,
						"username_exists": username_exists,
						"password_valid": true,
						"email_valid": true
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


	getPost(req: express.Request, res: express.Response): void {
		var postId = parseInt(req.params.post_id)
		var renter_id = 0
		//var renter_id = (req.body.renter_id !== undefined) ? 0 : 0 //if logged
		var post = "SELECT p.post_id, owner_id, name, address, information, AVG(rating) FROM Post AS p INNER JOIN Review AS r ON p.post_id = r.post_id WHERE p.post_id = ? GROUP BY p.post_id; "
		var images = "SELECT image_url FROM Image AS i INNER JOIN ImagePost AS ip ON i.image_id = ip.image_id WHERE post_id = ?; "
		var sports = "SELECT DISTINCT sport_name FROM Post AS p INNER JOIN Field AS f ON f.post_id = p.post_id INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE p.post_id = ?; "
		var reviews = "SELECT r.review_id, r.renter_id, r.content, r.date_time, r.rating, SUM(O.opinion) AS votes , n.votedby FROM Review AS r INNER JOIN Post AS p ON p.post_id = r.post_id INNER JOIN Renter AS re ON r.renter_id = re.renter_id INNER JOIN ImageUser AS iu ON iu.user_id = re.user_id INNER JOIN Image AS i ON i.image_id = iu.image_id  LEFT OUTER JOIN Opinion AS o ON o.review_id = r.review_id LEFT OUTER JOIN (SELECT r2.review_id, o2.opinion AS votedby FROM Opinion AS o2 INNER JOIN Review AS r2 ON r2.review_id = o2.review_id WHERE o2.renter_id = ?  GROUP BY r2.review_id) AS n ON r.review_id = n.review_id WHERE p.post_id = ? GROUP BY r.review_id ORDER BY votes DESC; "
		var fields = "SELECT f.field_id, f.name, f.price, f.recommended_number_of_persons, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Field AS f INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE f.post_id = ? GROUP BY f.field_id;"
        db.query(post + images + sports+ reviews + fields  ,[postId, postId, postId, renter_id, postId, postId], function(err, results) {
			if (err) throw err;
			const post = {
				"post_id": postId,
				"name": results[0][0].name,
    			"images": results[1],
   				"address": results[0][0].address,
   				"description": results[0][0].information,
				"sports": results[2],
    			"rating": results[0][0].rating,
    			"reviews": results[3],
				"fields": results[4]
				} as Post; 
				res.json(post)	
		  });
	}
	
	getPosts(req: express.Request, res: express.Response): void {
		var qry = "SELECT p.post_id, o.owner_id, p.name, u.username, AVG(r.rating) AS rating,GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names, i.image_url, MIN(f.price) as min_price, MAX(f.price) as max_price FROM Post AS p INNER JOIN Owner AS o ON p.owner_id = o.owner_id INNER JOIN User AS u ON o.user_id = u.user_id LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id LEFT OUTER JOIN Field AS f ON p.post_id = f.post_id LEFT OUTER JOIN FieldType AS ft ON f.field_id = ft.field_id LEFT OUTER JOIN Sport AS s ON s.sport_id = ft.sport_id LEFT OUTER JOIN ImagePost AS ip ON p.post_id = ip.post_id INNER JOIN Image AS i ON ip.image_id = i.image_id WHERE incr_id = 1  GROUP BY p.post_id;" 
        db.query( qry, function(err, results) {
			if (err) throw err;

			var miniPosts = [];

			for (let i = 0; i < results.length; i++) { 
				const miniPost = {
					"post_id": results[i].post_id,
					"owner_id": results[i].owner_id,
					"title": results[i].name,
					"username": results[i].username,
					"rating": results[i].rating,
					"sports": results[i].sports_names.split(','),
					"image": results[i].image_url
					} as MiniPost;
				miniPosts[i] = miniPost; 
			}
				res.json(miniPosts)	
		  });
	}
	
	editPost(req: express.Request, res: express.Response): void {
		var postId = req.body.post_id
		var name = req.body.name
		var address = req.body.address
		var information = req.body.information
		var addedImages = req.body.addedImages
		var deletedImages = req.body.deletedImages
		var update = "UPDATE Post SET name = ?, address = ?, information = ? WHERE post_id = ?; "
		var qryDeleteImages = ""
		for (let i = 0; i < deletedImages.length; i++) { 
			const image = deletedImages[i]
			qryDeleteImages += `DELETE ip.*,i.* FROM ImagePost ip JOIN Image i ON ip.image_id = i.image_id WHERE i.image_id = (SELECT i2.image_id FROM (SELECT * FROM Image) AS i2 WHERE i2.image_url = ${image}); ` 
			
		
		}
		var qryAddImages = ""
		for (let i = 0; i < addedImages.length; i++) { 
			const image = addedImages[i]
			qryAddImages += `INSERT INTO Image VALUES (${image}, NULL); INSERT INTO ImagePost VALUES ((SELECT i.image_id FROM image AS i WHERE i.image_url = ${image}), ${postId}, (SELECT max(incr_id) FROM (SELECT * FROM ImagePost) AS ImagePost2 WHERE ImagePost2.post_id = ${postId}) + 1); `
		}
		
		db.query(update + qryDeleteImages + qryAddImages,[name, address, information, postId], function(err, results) {
			if (err) throw err; 
			res.status(200).json("good")
		  });
	}
	
	editFields(req: express.Request, res: express.Response): void {
		var postId = req.body.post_id
		var fields = req.body.fields
		var deletedfields = req.body.deletedfields
		
		
		var qryUpdate = ""
		for (let i = 0; i < fields.length; i++) { 
			const field = fields[i]
			const fieldId = field.field_id
			const name = field.name
			const price = field.price
			const maxNumberOfPersons = field.recommended_number_of_persons
			const deletedSports = field.deletedSports
			const addedSports = field.addedSports
			qryUpdate += `UPDATE Field SET name = ${name}, price = ${price}, recommended_number_of_persons = ${maxNumberOfPersons} WHERE post_id = ${postId} AND field_id = ${fieldId}; `
			for (let i = 0; i < addedSports.length; i++) { 
				const sportName = addedSports[i]
				qryUpdate += `INSERT INTO FieldType VALUES((SELECT sport_id FROM Sport WHERE sport_name = ${sportName}), ${fieldId}); `
			}
			for (let i = 0; i < deletedSports.length; i++) { 
				const sportName = deletedSports[i]
				qryUpdate += `DELETE FROM FieldType AS ft WHERE ft.field_id = ${fieldId} AND sport_id = (SELECT sport_id FROM Sport WHERE sport_name = ${sportName});; `
			}
		}
	
		var qryDelete= ""
		for (let i = 0; i < deletedfields.length; i++) { 
			const fieldId = deletedfields[i]
			qryDelete += `DELETE ft.*,f.* FROM FieldType ft JOIN Field f ON ft.field_id = f.field_id WHERE ft.field_id = ${fieldId}; `
		}
		
		db.query(qryUpdate + qryDelete ,[], function(err, results) {
			if (err) throw err; 
			res.status(200).json("good")
		  });
	}
	
	getReservations(req: express.Request, res: express.Response): void {
		var renterID = req.body.renterID
		var ownnerID = req.body.ownnerID 
		//or use userID ???

		// if renter,,,, pas oublié if owner ;)
		var qry = "SELECT r.reservation_id, re.renter_id, p.post_id, f.field_id, p.name AS post_name, f.name AS field_name, r.date, r.time FROM Reservation r JOIN Renter re ON r.renter_id = re.renter_id JOIN Post p ON p.post_id = r.post_id JOIN Field f ON f.field_id = r.field_id WHERE re.renter_id = ? ORDER BY r.date ASC, r.time ASC; "
        db.query(qry ,[renterID], function(err, results) {
			if (err) throw err;
			var reservations = [];

			for (let i = 0; i < results.length; i++) { 
				const reservation = {
					"reservation_id": results[i].reservation_id,
					"renter_id": results[i].renter_id,
					"owner_id": results[i].owner_id,
					"post_id": results[i].post_id,
					"field_id": results[i].field_id,
					"date": results[i].date,
					"time": results[i].time,
					"post_name": results[i].post_name,
					"field_name": results[i].field_name
					
					} as Reservation;
					reservations[i] = reservation; 
			}
				res.json(reservations)
		  });
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
