import * as express from 'express';
import * as path from 'path';
import { db } from '../db';
import { BaseController } from './base.controller';
import * as h from './helpfile';
import * as makepost from './makepost'

import { Post } from '../models/post.model';
import { MiniPost } from '../models/mini.post.model';
import { Reservation } from '../models/reservation.model';

export class ApiController extends BaseController {

	constructor() {
		super("/api");
	}


	initializeRoutes(): void {
		// GET /api
		this.router.post("/login", this.login.bind(this))
		this.router.post("/register", this.register.bind(this))
		this.router.get("/profile/:username", this.profile.bind(this));
		this.router.post("/editProfile", this.editProfile.bind(this))
		this.router.post("/test", h.test.bind(this))
		this.router.post("/post", this.createPost.bind(this))
		this.router.post("/addImagePost", makepost.AddImagePost.bind(this))
		this.router.post("/addField", makepost.addField.bind(this))
		this.router.post("/uploadImage", this.imageUpload.bind(this))

		this.router.get("/getPost/:post_id", this.getPost.bind(this));
        this.router.get("/getPosts", this.getPosts.bind(this));
        this.router.put("/editPost", this.editPost.bind(this));
        this.router.put("/editFields", this.editPost.bind(this));

		this.router.get("/connected", this.isUserAlreadyConnected.bind(this))
		this.router.get("/logout", this.logout.bind(this))
		this.router.get("/tags", this.getTags.bind(this))
		this.router.get("/image/:id", this.image.bind(this))
	}

	//Hamza edited
	imageUpload(req: express.Request, res: express.Response): void {
		if(req.session.userInfo == undefined){
			res.send({ success: false, errorMsg: "You are not connected!" })
			return
		}
		try {
			if(req.files['thumbnail'] && req.files['thumbnail'].mimetype.includes('image')){
				db.query("SELECT COUNT(image_id) as amount FROM image;", (err, result) => {
					const thumbnail = req.files['thumbnail'];
					const imageCount = (result[0].amount + 2)
					const filename = req.session.userInfo.username+'_'+imageCount+'.png'
					const saveurl = './static/images/' + filename
					const imageURL = '/images/'+filename
					db.query(`INSERT INTO Image VALUES ("${imageURL}", null)`, (err, result) => {
						if (err) {
							res.status(500).json({ success: false, errorMsg: "Error, cant upload image!"})
							return
						}
						thumbnail.mv(saveurl);
						res.status(200).json({ 
							success: true, 
							errorMsg: "Thumbnail uploaded successfully!",
							imageid: imageCount
						})
					})
				})
			} else {
				res.status(404).json({ success: false, errorMsg: "Unknown error while processing file!"})
			}
		} catch (error) {
			res.status(500).json({ success: false, errorMsg: "Error, cant upload image!"})
		}
	}

	image(req: express.Request, res: express.Response): void {
		const imageid = req.params.id
		db.query(`SELECT image_url FROM image WHERE image_id = ${imageid}`, (err, result) => {
			if(err || result.length === 0) {
				res.sendFile(path.join(__dirname, "../../static/images/404.png"));
				return
			}
			res.sendFile(path.join(__dirname, "../../static/"+result[0].image_url));
		})
	}

	// Hamza edited
	login(req: express.Request, res: express.Response): void {
		const username = req.body.username
		const password = req.body.password

		if(username == undefined || password == undefined){
			res.json({ "success": false, 'errorMsg': 'Invalid form' })
			return
		}

		if(req.session.userInfo){
			res.json({ "success": false, 'errorMsg': 'Already connected!!!' })
			return
		}
		
		const queryRenter = `SELECT * FROM  User JOIN Owner ON User.user_id = Owner.user_id WHERE username = "${username}";`
		const queryOwner =  `SELECT * FROM  User JOIN Renter ON User.user_id = Renter.user_id WHERE username = "${username}"`
		
		db.query(queryRenter+queryOwner, [1, 2], function (err, results) {
				if (err){
					res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
					return
				}

				if(results[0].length > 0 && results[1].length > 0){
					res.json({ "success": false, 'errorMsg': 'Error occured, multiple account with same username exists!' })
					return
				}

				if(results[0].length == 0 && results[1].length == 0){
					res.json({ "success": false, 'errorMsg': 'Error occured!' })
					return
				}

				// Check if renter was found
				if(results[0].length > 0) {
					const userinfo = results[0][0]
					if(userinfo.password == password){
						res.json({
							"success": true,
							"is_renter": (userinfo.renter_id !== undefined),
							"is_owner": (userinfo.owner_id !== undefined),
							'errorMsg': "No error"
						})
						req.session.userInfo = { logged: true, userid: userinfo.user_id, is_owner: (userinfo.owner_id !== undefined), is_renter: (userinfo.renter_id !== undefined), firstname: userinfo.first_name, lastname: userinfo.last_name, email: userinfo.email, password, username}
						req.session.save()
						return
					}
				}
				// Check if owner was found
				if(results[1].length > 0){
					const userinfo = results[1][0]
					if(userinfo.password == password){
						res.json({
							"success": true,
							"is_renter": (userinfo.renter_id !== undefined),
							"is_owner": (userinfo.owner_id !== undefined),
							'errorMsg': "No error"
						})
						req.session.userInfo = { logged: true, userid: userinfo.user_id, is_owner: (userinfo.owner_id !== undefined), is_renter: (userinfo.renter_id !== undefined), firstname: userinfo.first_name, lastname: userinfo.last_name, email: userinfo.email, password, username}
						req.session.save()
						return
					}
				}
				res.json({
					"success": false,
					'errorMsg': "Error occured!"
				})
			});
		}

	// Hamza edited
	// Destroys session of user
	logout(req: express.Request, res: express.Response): void {
		if(req.session.userInfo !== undefined) {
			res.json({
				"success": true
			})
			req.session.destroy((err) => {})
		} else {
			res.json({
				"success": false
			})
		}
	}

	// Hamza edited
	register_user(req, res, firstname, lastname, username, password, email, dateofbirth, is_renter, is_owner): void {
		db.query(`INSERT INTO User VALUES(NULL,"${username}","${firstname}","${lastname}","${email}", "${password}")`,
			function (error, result) {
				if (error) {
					res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
					return
				}
				var user_id = result.insertId;
				if (is_renter) {
					db.query(`INSERT INTO Renter VALUES(NULL,"${dateofbirth}", ${user_id})`, (error, result) => { 
						if (error) {
							res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
							return
						}
						res.json({
							"success": true,
							'errorMsg': "No error"
						})
						req.session.userInfo = { logged: true, userid: user_id, is_owner: false, is_renter: true}
						req.session.save()
					})
					return
				}
				if(is_owner) {
					db.query(`INSERT INTO Owner VALUES(NULL, ${user_id})`, (error, result) => { 
						if (error) {
							res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
							return
						}
						res.json({ "success": true, 'errorMsg': "No error" })
						req.session.userInfo = { logged: true, userid: user_id, is_owner: true, is_renter: false}
						req.session.save()
					})
					return
				}
			})
	}

	// Hamza edited
	register(req: express.Request, res: express.Response): void {
		const first_name = req.body.fname
		const last_name = req.body.lname
		const email = req.body.email
		const dateofbirth = req.body.dateofbirth
		const username = req.body.username
		const password = req.body.password
		const is_renter = req.body.is_renter
		const is_owner = req.body.is_owner

		// Checking form ((is_renter == undefined && dateofbirth == undefined) || is_owner == undefined) || (is_owner == undefined && is_renter == undefined)
		if(first_name == undefined || last_name == undefined || email == undefined || username == undefined || password == undefined || (is_renter !== undefined && is_owner !== undefined) || (is_renter !== undefined && dateofbirth == undefined)){
			res.json({ "success": false, 'errorMsg': 'Invalid form' })
			return
		}

		// Queries
		const query_checkMail = `SELECT COUNT(*) as matching_email FROM user WHERE email = "${email}";`
		const query_checkUsername = `SELECT COUNT(*) as matching_username FROM user WHERE username = "${username}"`

		db.query(query_checkMail+query_checkUsername,
			[1, 2],
			(err, results) => {
				if (err){
					res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
					return
				}

				// Booleans that indicates whether or not email or username are already in use
				var email_exists = results[0][0].matching_email > 0
				var username_exists = results[1][0].matching_username > 0

				if(email_exists){
					res.json({ "success": false, 'errorMsg': 'Error: email adress already in use!' })
					return
				}

				if(username_exists){
					res.json({ "success": false, 'errorMsg': 'Error: username already in use!' })
					return
				}

				// This help function returns json to client using res
				this.register_user(req, res, first_name, last_name, username, password, email, dateofbirth, is_renter, is_owner);
			})
	}

	// Hamza created
	// route used when frontend wants to know whether or not there user was already connected
	isUserAlreadyConnected(req: express.Request, res: express.Response): void {
		if(req.session.userInfo !== undefined) {
			res.json({
				logged: true,
				userid: req.session.userInfo.userid,
				is_renter: req.session.userInfo.is_renter,
				is_owner: req.session.userInfo.is_owner,
				firstname: req.session.userInfo.firstname,
				lastname: req.session.userInfo.lastname,
				email: req.session.userInfo.email
			})
			return
		}
		res.json({
			logged: false
		})
	}

	// /api/profile[post] (bilal)
	// Edited by Hamza
	profile(req: express.Request, res: express.Response): void {
		const username = req.params.username

		if(username == undefined){
			res.json({ "success": false, 'errorMsg': 'Invalid form' })
			return
		}

		const query_userIsRenter = `SELECT * FROM User JOIN Renter ON User.user_id = Renter.user_id WHERE username = "${username}";`
		const query_userIsOwner = `SELECT * FROM User JOIN Owner  ON User.user_id = Owner.user_id WHERE username = "${username}"`

		db.query(query_userIsRenter+query_userIsOwner,
			[1, 2],
			(err, results) => {
				if (err){
					res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
					return
				}

				if(results[0].length > 0 || results[1].length > 0){
					// Profile is a renter
					if(results[0].length > 0){
						const renter = results[0][0]
						res.json({
							"success": true,
							"username": renter.username,
							"first_name": renter.first_name,
							"last_name": renter.last_name,
							"email": renter.email,
							"dateofbirth": renter.date_of_birth,
							"is_owner": false,
							"is_renter": true
						})
						return
					}
					// Profile is a owner
					if(results[1].length > 0){
						const owner = results[1][0]
						res.json({
							"success": true,
							"username": owner.username,
							"first_name": owner.first_name,
							"last_name": owner.last_name,
							"email": owner.email,
							"dateofbirth": owner.date_of_birth,
							"is_owner": true,
							"is_renter": false
						})
						return
					}
				}
				res.json({
					"success": false,
					"errorMsg": "Profile not found!"
				})
			})
	}

	// Hamza edited
	// Avoid changing password, hence need to get password
	editProfile(req: express.Request, res: express.Response): void {
		if(req.session.userInfo == undefined){
			res.send({
				success: false,
				errorMsg: "You are not connected!"
			})
			return
		}
		
		const firstname = req.body.fname
		const lastname = req.body.lname
		const email = req.body.email
		const password = (req.body.password == undefined) ? req.session.userInfo.password : req.body.password //If password is not provided, use users password
		const dateofbirth = req.body.dateofbirth
		const is_renter = req.session.userInfo.is_renter
		const is_owner = req.session.userInfo.is_owner
		const userid = req.session.userInfo.userid

		if(firstname == undefined || lastname == undefined || email == undefined || (is_renter == undefined && dateofbirth == undefined) || is_owner == undefined){
			res.send({
				success: false,
				errorMsg: "Invalid form!"
			})
			return
		}

		// Form validation here!
		if(!(firstname.length > 4)){
			res.send({
				success: false,
				errorMsg: "Invalid!"
			})
			return
		}
		
		// Query to update usertable
		const query_UpdateUserInfo = `UPDATE USER SET first_name = "${firstname}", last_name = "${lastname}", email = "${email}", password = "${password}" WHERE user_id = ${userid}`

		db.query(query_UpdateUserInfo, (err) => {
			if (err) {
				res.json({ success: false, errorMsg: 'Error occured!'})
				throw err
				return
			}
			if(req.session.userInfo.is_owner){
				res.send({
					success: true,
					errorMsg: "No error"
				})
				return
			}
			if(req.session.userInfo.is_renter){
				// Query to update informations relative to renters (extra info)
				const query_UpdateExtraRenter = `UPDATE RENTER SET date_of_birth = "${dateofbirth}" WHERE user_id = ${userid}`
				db.query(query_UpdateExtraRenter, (err) => {
					if (err) {
						res.json({ success: false, errorMsg: 'Error occured!'})
						throw err
						return
					}
					res.send({
						success: true,
						errorMsg: "No error"
					})
					return
				})
			}
		})
	}

	// Hamza added
	// Get sport tags for frontend
	getTags(req: express.Request, res: express.Response): void {
		db.query("SELECT sport_name FROM sport", (err, result) => {
			if (err) {
				res.json({"success": false, 'errorMsg': "Error with sql!"})
				return
			}
			res.json({ tags: result.map(x => x.sport_name)})
		})
	}

	// Taha!
	createPost(req: express.Request, res: express.Response): void {
		if(req.session.userInfo && !req.session.userInfo.is_owner){
			res.json({"success": false, "errorMsg": "You are not connected or you are not a owner"})
			return
		}
		
		const name = req.body.name
		const address = req.body.location
		const description = req.body.description
		const user_id = req.session.userInfo.userid
		const thumbnail_id = req.body.thumbnail
		const images_id_array = req.body.images
		const fields_array = req.body.fields

		if(name == undefined || address == undefined || description == undefined || thumbnail_id == undefined || fields_array == undefined || images_id_array == undefined){
			res.json({"success": false, "errorMsg": "Invalid form!"})
			return
		} 

		var qry = `INSERT INTO Post VALUES(NULL, ?, ?, ?, (SELECT o.owner_id FROM USER AS u INNER JOIN Owner AS o ON u.user_id = o.user_id WHERE o.user_id = ${user_id}));`
		var qryAddImages = `INSERT INTO ImagePost VALUES (${thumbnail_id}, (SELECT max(post_id) FROM Post), COALESCE((SELECT max(incr_id) FROM (SELECT * FROM ImagePost) AS ImagePost2 WHERE ImagePost2.post_id = (SELECT max(post_id) FROM Post)), 0) + 1); `

		for (let i = 0; i < images_id_array.length; i++) { 
			const image_id = images_id_array[i]
			qryAddImages += `INSERT INTO ImagePost VALUES (${image_id}, (SELECT max(post_id) FROM Post), COALESCE((SELECT max(incr_id) FROM (SELECT * FROM ImagePost) AS ImagePost2 WHERE ImagePost2.post_id = (SELECT max(post_id) FROM Post)), 0) + 1); `
		}
	
		var qryUpdate = ""
		for (let i = 0; i < fields_array.length; i++) { 
			const field = fields_array[i]
			const name = field.name
			const price = field.price
			const recommendedNumberOfPersons = field.recommended
			const addedSports = field.tags
			qryUpdate += `INSERT INTO Field VALUES(NULL, (SELECT max(post_id) FROM Post), "${name}", "${price}", "${recommendedNumberOfPersons}"); `
			for (let i = 0; i < addedSports.length; i++) { 
				const sportName = addedSports[i]
				qryUpdate += `INSERT INTO FieldType VALUES((SELECT sport_id FROM Sport WHERE sport_name = "${sportName}"), (SELECT max(field_id) FROM Field)); `
			}
		}
		db.query(qry + qryAddImages + qryUpdate, [name, address, description], function(err, results) {
			if (err){
				res.status(500).json({success: false, errorMsg: "Erro with sql!"})
				throw err
				return
			}
			res.status(200).json({success: true, errorMsg: "no error"})
		});
	
	}

	// Hamza checkpoint, not here yet!
	getPost(req: express.Request, res: express.Response): void {
		var postId = parseInt(req.params.post_id)
		var renter_id = 0
		//var renter_id = (req.body.renter_id !== undefined) ? 0 : 0 //if logged
		var post = "SELECT p.post_id, owner_id, name, address, information, AVG(rating) FROM Post AS p LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id WHERE p.post_id = ? GROUP BY p.post_id; "
        var images = "SELECT image_url FROM Image AS i INNER JOIN ImagePost AS ip ON i.image_id = ip.image_id WHERE post_id = ?; "
        var sports = "SELECT DISTINCT sport_name FROM Post AS p INNER JOIN Field AS f ON f.post_id = p.post_id INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE p.post_id = ?; "
        var reviews = "SELECT r.review_id, r.renter_id, r.content, r.date_time, r.rating, SUM(O.opinion) AS votes , n.votedby FROM Review AS r INNER JOIN Post AS p ON p.post_id = r.post_id INNER JOIN Renter AS re ON r.renter_id = re.renter_id INNER JOIN ImageUser AS iu ON iu.user_id = re.user_id INNER JOIN Image AS i ON i.image_id = iu.image_id  LEFT OUTER JOIN Opinion AS o ON o.review_id = r.review_id LEFT OUTER JOIN (SELECT r2.review_id, o2.opinion AS votedby FROM Opinion AS o2 INNER JOIN Review AS r2 ON r2.review_id = o2.review_id WHERE o2.renter_id = ?  GROUP BY r2.review_id) AS n ON r.review_id = n.review_id WHERE p.post_id = ? GROUP BY r.review_id ORDER BY votes DESC; "
        var fields = "SELECT f.field_id, f.name, f.price, f.recommended_number_of_persons, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Field AS f INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE f.post_id = ? GROUP BY f.field_id;"
        db.query(post + images + sports+ reviews + fields  ,[postId, postId, postId, renter_id, postId, postId], function(err, results) {
			if (err) {
				res.json({ success: "false", errorMsg:"post not found!"})
				return
			}
			
			const post = {
				"succes": true,
				"post_id": postId,
				"name": results[0][0].name,
    			"images": results[1],
   				"address": results[0][0].address,
   				"description": results[0][0].information,
				"sports": results[2].map(x => x.sport_name),
    			"rating": results[0][0],
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
					"sports": results[i].sports_names,
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
