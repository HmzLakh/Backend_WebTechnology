import * as express from 'express';
import * as path from 'path';
import { db } from '../db';
import { BaseController } from './base.controller';
import { Post } from '../models/post.model';
import { MiniPost } from '../models/mini.post.model';

export class ApiController extends BaseController {

	constructor() {
		super("/api");
	}

	initializeRoutes(): void {
		this.router.post("/login", this.login.bind(this))
		this.router.post("/register", this.register.bind(this))
		this.router.get("/profile/:username", this.profile.bind(this));
		this.router.post("/editProfile", this.editProfile.bind(this))
		this.router.post("/post", this.createPost.bind(this))
		this.router.post("/uploadImage", this.imageUpload.bind(this))
		this.router.get("/getPost/:post_id", this.getPost.bind(this));
        this.router.get("/getPosts", this.getPosts.bind(this));
        this.router.put("/post", this.editPost.bind(this));
		this.router.post("/deletepost", this.deletepost.bind(this));
		this.router.get("/connected", this.isUserAlreadyConnected.bind(this))
		this.router.get("/logout", this.logout.bind(this))
		this.router.get("/tags", this.getTags.bind(this))
		this.router.get("/image/:id", this.image.bind(this))
		this.router.get("/getMyPosts", this.getMyPosts.bind(this))
		this.router.get("/getMyPost/:postid", this.getMyPost.bind(this))
		this.router.get("/getMap", this.getMapPosts.bind(this))
		this.router.post("/review", this.makeReview.bind(this))
		this.router.post("/opinion", this.makeOpinion.bind(this))
	}

	/**
	 * Upload route for images, this route is used to upload an image to the backend server
	 * It registers the relative path in the database and returns the imageid back to the client
	 * in a json
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	imageUpload(req: express.Request, res: express.Response): void {
		if(req.session.userInfo == undefined){
			res.send({ success: false, errorMsg: "You are not connected!" })
			return
		}
		try {
			if(req.files['thumbnail'] && req.files['thumbnail'].mimetype.includes('image')){
				db.query("SELECT COUNT(image_id) as amount FROM image;", (err, result) => {
					const thumbnail = req.files['thumbnail'];
					const imageCount = (result[0].amount + 1)
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

	/**
	 * Route used in order to get an image using the relative path found in the database with the given imageid from the client
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	image(req: express.Request, res: express.Response): void {
		const imageid = req.params.id
		db.query(`SELECT image_url FROM image WHERE image_id = ${imageid}`, (err, result) => {
			if(err || result.length === 0) {
				res.status(404).sendFile(path.join(__dirname, "../../static/images/404.png"));
				return
			}
			res.status(200).sendFile(path.join(__dirname, "../../static/"+result[0].image_url));
		})
	}

	/**
	 * Login route used to authenticate users, we make the difference between renters and owners with the database 
	 * We register the session using Express session and we extend the session with UserInfo model.
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	login(req: express.Request, res: express.Response): void {
		const username = req.body.username
		const password = req.body.password
		// We check that body has what we need
		if(username == undefined || password == undefined){
			res.json({ "success": false, 'errorMsg': 'Invalid form' })
			return
		}
		// We also check that user is not connected!
		if(req.session.userInfo){
			res.json({ "success": false, 'errorMsg': 'Already connected!!!' })
			return
		}
		// Queries for database
		const queryRenter = `SELECT * FROM  User JOIN Owner ON User.user_id = Owner.user_id WHERE username = "${username}";`
		const queryOwner =  `SELECT * FROM  User JOIN Renter ON User.user_id = Renter.user_id WHERE username = "${username}"`
		
		db.query(queryRenter+queryOwner, [1, 2], function (err, results) {
			if (err){
				res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
				return
			}
			// If both queries are empty, it means that no account is registered with the given information in the body
			if(results[0].length == 0 && results[1].length == 0){
				res.json({ "success": false, 'errorMsg': 'Username or password incorrect' })
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
					// Extend session and save it!
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
					// Extend session and save it!
					req.session.userInfo = { logged: true, userid: userinfo.user_id, is_owner: (userinfo.owner_id !== undefined), is_renter: (userinfo.renter_id !== undefined), firstname: userinfo.first_name, lastname: userinfo.last_name, email: userinfo.email, password, username}
					req.session.save()
					return
				}
			}
			res.json({ success: false, errorMsg: "Error occured!"})
		});
	}

	/**
	 * Route used to destroy the user session
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	logout(req: express.Request, res: express.Response): void {
		if(req.session.userInfo !== undefined) {
			res.json({ success: true })
			req.session.destroy((err) => {})
		} else {
			res.json({ success: false })
		}
	}

	/**
	 * Helperfunction to help register route, response to client is sent here
	 * We insert an user in the database and we get his id from the insert
	 * With this id we insert on separate table renter or owner relative informations
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	register_user(req, res, firstname, lastname, username, password, email, dateofbirth, is_renter, is_owner): void {
		// Queries
		const query_InsertUser = `INSERT INTO User VALUES(NULL,"${username}","${firstname}","${lastname}","${email}", "${password}")`
		const query_InsertRenter = (user_id) => `INSERT INTO Renter VALUES(NULL,"${dateofbirth}", ${user_id})`
		const query_InsertOwner = (user_id) => `INSERT INTO Owner VALUES(NULL, ${user_id})`
		// Request to database to insert user and insert owner & renter on seperate tables
		db.query(query_InsertUser, (error, result) => {
			if (error) {
				res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
				return
			}
			var user_id = result.insertId;
			// If user is a renter, we save informations relative to renters
			if (is_renter) {
				db.query(query_InsertRenter(user_id), (error, result) => { 
					if (error) {
						res.json({ success: false, errorMsg: 'Error occured with sql request' })
						return
					}
					res.json({ success: true, errorMsg: "No error" })
					req.session.userInfo = { logged: true, userid: user_id, is_owner: false, is_renter: true, firstname, lastname, email, password, username}
					req.session.save()
				})
				return
			}
			// If user is an owner, we save informations relative to owners
			if(is_owner) {
				db.query(query_InsertOwner(user_id), (error, result) => { 
					if (error) {
						res.json({ success: false, errorMsg: 'Error occured with sql request' })
						return
					}
					res.json({ success: true, errorMsg: "No error" })
					req.session.userInfo = { logged: true, userid: user_id, is_owner: true, is_renter: false, firstname, lastname, email, password, username}
					req.session.save()
				})
				return
			}
		})
	}

	/**
	 * Route used to register a renter or an owner.
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	register(req: express.Request, res: express.Response): void {
		const first_name = req.body.fname
		const last_name = req.body.lname
		const email = req.body.email
		const dateofbirth = req.body.dateofbirth
		const username = req.body.username
		const password = req.body.password
		const is_renter = req.body.is_renter
		const is_owner = req.body.is_owner
		// Checking if body contains every information we need
		if(first_name == undefined || last_name == undefined || email == undefined || username == undefined || password == undefined || (is_renter !== undefined && is_owner !== undefined) || (is_renter !== undefined && dateofbirth == undefined)){
			res.json({ success: false, errorMsg: 'Invalid form' })
			return
		}
		// Queries
		const query_checkMail = `SELECT COUNT(*) as matching_email FROM user WHERE email = "${email}";`
		const query_checkUsername = `SELECT COUNT(*) as matching_username FROM user WHERE username = "${username}";`
		db.query(query_checkMail+query_checkUsername, [], (err, results) => {
			if (err){
				res.json({ success: false, errorMsg: 'Error occured with sql request' })
				return
			}
			// Booleans that indicates whether or not email or username are already in use
			var email_exists = !(results[0][0].matching_email === 0)
			var username_exists = !(results[1][0].matching_username === 0)
			// Form validation: We check if email adress or username is already in use!
			if(email_exists || username_exists){
				res.json({ success: false, errorMsg: 'Error: email adress or username is already used!' })
				return
			}
			// This help function returns json to client using Express response
			this.register_user(req, res, first_name, last_name, username, password, email, dateofbirth, is_renter, is_owner);
		})
	}

	/**
	 * Route used to check if user has already an existent session on the backend,
	 * if this is the case, we sent him every informations relative to that session
	 * otherwise nothing!
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	isUserAlreadyConnected(req: express.Request, res: express.Response): void {
		if(req.session.userInfo) {
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
		res.json({ logged: false })
	}


	/**
	 * Route used to get informations relative to a profile using the username
	 * we sent the informations back to the client
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	profile(req: express.Request, res: express.Response): void {
		const username = req.params.username
		if(username == undefined){
			res.json({ success: false, errorMsg: 'Invalid form' })
			return
		}
		const query_userIsRenter = `SELECT * FROM User JOIN Renter ON User.user_id = Renter.user_id WHERE username = "${username}";`
		const query_userIsOwner = `SELECT * FROM User JOIN Owner  ON User.user_id = Owner.user_id WHERE username = "${username}"`
		db.query(query_userIsRenter+query_userIsOwner, [1, 2], (err, results) => {
			if (err){
				res.json({ "success": false, 'errorMsg': 'Error occured with sql request' })
				return
			}
			if(results[0].length > 0 || results[1].length > 0){
				// Profile is a renter
				if(results[0].length > 0){
					const renter = results[0][0]
					res.json({
						success: true,
						username: renter.username,
						first_name: renter.first_name,
						last_name: renter.last_name,
						email: renter.email,
						dateofbirth: renter.date_of_birth,
						is_owner: false,
						is_renter: true
					})
					return
				}
				// Profile is a owner
				if(results[1].length > 0){
					const owner = results[1][0]
					res.json({
						success: true,
						username: owner.username,
						first_name: owner.first_name,
						last_name: owner.last_name,
						email: owner.email,
						dateofbirth: owner.date_of_birth,
						is_owner: true,
						is_renter: false
					})
					return
				}
			}
			res.json({ success: false, errorMsg: "Profile not found!" })
		})
	}

	/**
	 * Edit profile route, this is used when user wants to edit his information relative to his account
	 * (UPDATE)
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	editProfile(req: express.Request, res: express.Response): void {
		if(req.session.userInfo == undefined){
			res.send({ success: false, errorMsg: "You are not connected!" })
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
		// We check that everything is in the body
		if(firstname == undefined || lastname == undefined || email == undefined || (is_renter == undefined && dateofbirth == undefined) || is_owner == undefined){
			res.send({ success: false, errorMsg: "Invalid form!" })
			return
		}
		// Form validation here!
		// TODO crée une function séparé pour le form validation!
		if(!(firstname.length > 4)){
			res.send({ success: false, errorMsg: "Username must be larger than 4 characters!" })
			return
		}
		
		// Query to update usertable
		const query_UpdateUserInfo = `UPDATE USER SET first_name = "${firstname}", last_name = "${lastname}", email = "${email}", password = "${password}" WHERE user_id = ${userid}`
		db.query(query_UpdateUserInfo, (err) => {
			if (err) {
				res.json({ success: false, errorMsg: 'Error occured with sql!'})
				return
			}
			if(req.session.userInfo.is_owner){
				res.send({ success: true, errorMsg: "No error" })
				// Update information on current session
				req.session.userInfo.firstname = firstname
				req.session.userInfo.lastname = lastname
				req.session.userInfo.email = email
				req.session.userInfo.password = password
				req.session.save()
				return
			}
			if(req.session.userInfo.is_renter){
				// Query to update informations relative to renters (extra info)
				const query_UpdateExtraRenter = `UPDATE RENTER SET date_of_birth = "${dateofbirth}" WHERE user_id = ${userid}`
				db.query(query_UpdateExtraRenter, (err) => {
					if (err) {
						res.json({ success: false, errorMsg: 'Error occured with sql!'})
						return
					}
					res.send({ success: true, errorMsg: "No error" })
					// Update information on current session
					req.session.userInfo.firstname = firstname
					req.session.userInfo.lastname = lastname
					req.session.userInfo.email = email
					req.session.userInfo.password = password
					req.session.save()
					return
				})
			}
		})
	}

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

	/**
	 * Route used to create a post, works only when user is a owner!
	 * We add every fields in the database and every images that are sent,
	 * images are sent under the form of images_id that were returned from uploadImage route
	 * (CREATE)
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	createPost(req: express.Request, res: express.Response): void {
		const name = req.body.name
		const address = req.body.location
		const description = req.body.description
		const user_id = req.session.userInfo.userid
		const thumbnail_id = req.body.thumbnail
		const images_id_array = req.body.images
		const fields_array = req.body.fields
		const phonenumber = req.body.phonenumber
		// We check that user has a session
		if(req.session.userInfo == undefined || req.session.userInfo.is_owner == false || req.session.userInfo.is_owner == undefined){
			res.json(400).json({ success: false, errorMsg: "You are not connected or you are not a owner"})
			return
		}
		// We check that the body contains every informations needed
		if(name == undefined || address == undefined || description == undefined || thumbnail_id == undefined || fields_array == undefined || images_id_array == undefined){
			res.json(400).json({success: false, errorMsg: "Invalid form!"})
			return
		} 
		// SQL queries
		var qry = `INSERT INTO Post VALUES(NULL, ?, ?, ?, (SELECT o.owner_id FROM USER AS u INNER JOIN Owner AS o ON u.user_id = o.user_id WHERE o.user_id = ${user_id}), "${phonenumber}");`
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
			const addedSports = field.tags !== undefined  ? field.tags : []
			qryUpdate += `INSERT INTO Field VALUES(NULL, (SELECT max(post_id) FROM Post), "${name}", "${price}", "${recommendedNumberOfPersons}"); `
			for (let i = 0; i < addedSports.length; i++) { 
				const sportName = addedSports[i]
				qryUpdate += `INSERT INTO FieldType VALUES((SELECT sport_id FROM Sport WHERE sport_name = "${sportName}"), (SELECT max(field_id) FROM Field)); `
			}
		}
		db.query(qry + qryAddImages + qryUpdate, [name, address, description], function(err) {
			if (err){
				res.status(500).json({success: false, errorMsg: "Error with SQL!"})
				return
			}
			res.status(200).json({success: true, errorMsg: "No error"})
		});
	}

	/**
	 * Route used to get every posts from a specific owner, those posts are shown in the dashboard in order to be edited
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getMyPosts(req: express.Request, res: express.Response): void {
		if(req.session.userInfo == undefined || req.session.userInfo.is_owner == false || req.session.userInfo.is_owner == undefined){
			res.status(200).json({success: false, errorMsg: "You are not connected or you are not a owner"})
			return
		}
		const user_id = req.session.userInfo.userid
		var qry = `SELECT p.post_id, o.owner_id, p.name, u.username, AVG(r.rating) AS rating,GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names, i.image_id, MIN(f.price) as min_price, MAX(f.price) as max_price FROM Post AS p INNER JOIN Owner AS o ON p.owner_id = o.owner_id INNER JOIN User AS u ON o.user_id = u.user_id LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id LEFT OUTER JOIN Field AS f ON p.post_id = f.post_id LEFT OUTER JOIN FieldType AS ft ON f.field_id = ft.field_id LEFT OUTER JOIN Sport AS s ON s.sport_id = ft.sport_id LEFT OUTER JOIN ImagePost AS ip ON p.post_id = ip.post_id LEFT OUTER JOIN Image AS i ON ip.image_id = i.image_id WHERE incr_id = 1  AND o.user_id = "${user_id}" GROUP BY p.post_id; `
        db.query(qry, (err, results) => {
			if (err){
				res.status(500).json({success: false, errorMsg: "Error with sql!"})
				return
			}
			var miniPosts = [];
			for (let i = 0; i < results.length; i++) { 
				const miniPost = {
					post_id: results[i].post_id,
					title: results[i].name,
					image: results[i].image_id
					} as MiniPost;
				miniPosts[i] = miniPost; 
			}
			res.json(miniPosts)	
		});
	}

	/**
	 * Route used to get a single post with every informations needed for the frontend to edit it.
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getMyPost(req: express.Request, res: express.Response): void {
		if(req.session.userInfo == undefined || req.session.userInfo.is_owner == false || req.session.userInfo.is_owner == undefined){
			res.json({"success": false, "errorMsg": "You are not connected or you are not a owner"})
			return
		}
		var postId = parseInt(req.params.postid)
		var renter_id = 0
		var post = "SELECT p.post_id, owner_id, name, address, information, AVG(rating), p.phone_number FROM Post AS p LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id WHERE p.post_id = ? GROUP BY p.post_id; "
		var images = "SELECT i.image_id FROM Image AS i INNER JOIN ImagePost AS ip ON i.image_id = ip.image_id WHERE post_id = ?; "
		var sports = "SELECT DISTINCT sport_name FROM Post AS p INNER JOIN Field AS f ON f.post_id = p.post_id INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE p.post_id = ?; "
		var fields = `SELECT f.field_id, f.name, f.price, f.recommended_number_of_persons, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Field AS f LEFT OUTER JOIN FieldType AS ft ON ft.field_id = f.field_id LEFT OUTER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE f.post_id = ${postId} GROUP BY f.field_id;`
        db.query(post + images + sports+ fields  ,[postId, postId, postId, renter_id, postId, postId], (err, results) => {
			if (err || results[0].length == 0){
				res.status(500).json({success: false, errorMsg: "Error with sql!"})
				return
			}
			for (const field of results[3]) {
				field.sports_names = field.sports_names.split(',')
			}
			const post = {
				name: results[0][0].name,
				thumbnail: results[1][0].image_id,
				images: results[1].slice(1),
				address: results[0][0].address,
				description: results[0][0].information,
				phone_number: results[0][0].phone_number,
				fields: results[3]
			} as unknown as Post; 
			res.status(200).json(post)	
		});
	}

	/**
	 * Route used to get a single post to show it to any user
	 * It is shown in the show page on the frontend
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getPost(req: express.Request, res: express.Response): void {
		var postId = parseInt(req.params.post_id)
		var post = "SELECT p.post_id, owner_id, name, address, information, AVG(rating), phone_number FROM Post AS p LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id WHERE p.post_id = ? GROUP BY p.post_id; "
        var images = "SELECT i.image_id FROM Image AS i INNER JOIN ImagePost AS ip ON i.image_id = ip.image_id WHERE post_id = ?; "
        var sports = "SELECT DISTINCT sport_name FROM Post AS p INNER JOIN Field AS f ON f.post_id = p.post_id INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE p.post_id = ?; "
        var reviews = `SELECT r.review_id, r.renter_id, u.username, r.content, r.date_time, r.rating, SUM(O.opinion) AS votes FROM Review AS r INNER JOIN Post AS p ON p.post_id = r.post_id INNER JOIN Renter AS re ON r.renter_id = re.renter_id INNER JOIN User AS u ON u.user_id = re.user_id LEFT OUTER JOIN ImageUser AS iu ON iu.user_id = re.user_id LEFT OUTER JOIN Image AS i ON i.image_id = iu.image_id LEFT OUTER JOIN Opinion AS o ON o.review_id = r.review_id WHERE p.post_id = ${postId} GROUP BY r.review_id ORDER BY votes DESC;`
        var fields = "SELECT f.field_id, f.name, f.price, f.recommended_number_of_persons, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Field AS f INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE f.post_id = ? GROUP BY f.field_id;"
        db.query(post + images + sports+ reviews + fields  ,[postId, postId, postId, postId, postId], (err, results) => {
			if (err) {
				res.json({ success: "false", errorMsg:"SQL error!"})
				return
			}
			if(results[0].length > 0) {
				const post = {
					succes: true,
					post_id: postId,
					name: results[0][0].name,
					images: results[1].map(x => x.image_id),
					address: results[0][0].address,
					description: results[0][0].information,
					sports: results[2].map(x => x.sport_name),
					rating: results[0][0],
					reviews: results[3],
					fields: results[4],
					phonenumber: results[0][0].phone_number
					} as Post;
				res.status(200).json(post)	
			} else {
				res.json({ success: "false", errorMsg:"Post not found!"})
			}
		});
	}
	
	/**
	 * Route used to get every posts in order to show them on the frontpage
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getPosts(req: express.Request, res: express.Response): void {
		var qry = "SELECT p.post_id, o.owner_id, p.name, u.username, AVG(r.rating) AS rating,GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names, i.image_id, MIN(f.price) as min_price, MAX(f.price) as max_price FROM Post AS p INNER JOIN Owner AS o ON p.owner_id = o.owner_id INNER JOIN User AS u ON o.user_id = u.user_id LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id LEFT OUTER JOIN Field AS f ON p.post_id = f.post_id LEFT OUTER JOIN FieldType AS ft ON f.field_id = ft.field_id LEFT OUTER JOIN Sport AS s ON s.sport_id = ft.sport_id LEFT OUTER JOIN ImagePost AS ip ON p.post_id = ip.post_id INNER JOIN Image AS i ON ip.image_id = i.image_id WHERE incr_id = 1  GROUP BY p.post_id;" 
        db.query( qry, function(err, results) {
			if (err) throw err; // We throw the error, because we can't do much if an error happens here
			var miniPosts = [];
			for (let i = 0; i < results.length; i++) {
				const miniPost = {
					post_id: results[i].post_id,
					owner_id: results[i].owner_id,
					title: results[i].name,
					username: results[i].username,
					rating: results[i].rating,
					sports: results[i].sports_names,
					image: results[i].image_id
					} as MiniPost;
				miniPosts[i] = miniPost; 
			}
			res.json(miniPosts)	
		});
	}

	/**
	 * Route used to update informations relative to a post.
	 * User need to be a owner and needs to have the post with the same id
	 * (UPDATE)
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	editPost(req: express.Request, res: express.Response): void {
		var postId = req.body.postid
		var name = req.body.name
		var address = req.body.location
		var information = req.body.description
		var images = req.body.images
		var thumbnail_id = req.body.thumbnail
		var phonenumber = req.body.phonenumber
		var update = `UPDATE Post SET name = "${name}", address = "${address}", information = "${information}", phone_number = "${phonenumber}" WHERE post_id = ${postId}; `
		var qryDeleteImages = `DELETE ip.* FROM ImagePost ip JOIN Image i ON ip.image_id = i.image_id WHERE ip.post_id = ${postId}; `
		var qryAddImages = `INSERT INTO ImagePost VALUES (${thumbnail_id}, (SELECT max(post_id) FROM Post), COALESCE((SELECT max(incr_id) FROM (SELECT * FROM ImagePost) AS ImagePost2 WHERE ImagePost2.post_id = (SELECT max(post_id) FROM Post)), 0) + 1); `
		if(images !== undefined){
			for (let i = 0; i < images.length; i++) { 
				const image_id = images[i]
				qryAddImages += `INSERT INTO ImagePost VALUES (${image_id},${postId} , COALESCE((SELECT max(incr_id) FROM (SELECT * FROM ImagePost) AS ImagePost2 WHERE ImagePost2.post_id = ${postId}), 0) + 1); `
			}
		}
		var fields = req.body.fields == undefined ? [] : req.body.fields
		var addedFields = req.body.addedfields == undefined ? [] : req.body.addedfields
		var deletedFields = req.body.deletedfields == undefined ? [] : req.body.deletedfields
		var qryUpdateFields = ""
		for (let i = 0; i < fields.length; i++) { 
			const field = fields[i]
			const fieldId = field.id
			const name = field.name
			const price = field.price
			const maxNumberOfPersons = (field.recommended !== undefined) ? field.recommended : []
			const addedSports = (field.tags !== undefined) ? field.tags : []
			qryUpdateFields += `DELETE FROM FieldType AS ft WHERE ft.field_id = ${fieldId};`
			qryUpdateFields += `UPDATE Field SET name = "${name}", price = ${price}, recommended_number_of_persons = ${maxNumberOfPersons} WHERE post_id = ${postId} AND field_id = ${fieldId}; `
			for (let i = 0; i < addedSports.length; i++) { 
				const sportName = addedSports[i]
				qryUpdateFields += `INSERT INTO FieldType VALUES((SELECT sport_id FROM Sport WHERE sport_name = "${sportName}"), ${fieldId}); `
			}
		}
		var qryDeletefields = ""
		for (let i = 0; i < deletedFields.length; i++) { 
			const fieldId = deletedFields[i]
			qryDeletefields += `DELETE ft.*,f.* FROM FieldType ft JOIN Field f ON ft.field_id = f.field_id WHERE ft.field_id = ${fieldId}; `
		}
		var qryAddedFields = ""
		for (let i = 0; i < addedFields.length; i++) { 
			const field = addedFields[i]
			const name = field.name
			const price = field.price
			const recommendedNumberOfPersons = field.recommended
			const addedSports = field.tags
			qryAddedFields += `INSERT INTO Field VALUES(NULL, ${postId}, "${name}", ${price}, ${recommendedNumberOfPersons}); `
			for (let i = 0; i < addedSports.length; i++) { 
				const sportName = addedSports[i]
				qryAddedFields += `INSERT INTO FieldType VALUES((SELECT sport_id FROM Sport WHERE sport_name = "${sportName}"), (SELECT max(field_id) FROM Field)); `
			}
		}
		
		db.query(update + qryDeleteImages + qryAddImages + qryUpdateFields + qryDeletefields + qryAddedFields, /*[name, address, information, postId],*/ (err) => {
			if (err) {
				res.status(400).send({ success: false, errorMsg: "Error sql!"})
				throw err
				return
			}
			res.status(200).json({ success: true, errorMsg: "no error"})
		});
	}
	
	/**
	 * Route used to get informations relative to posts in order to show icons on the minimap
	 * We get only the strict minimum
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getMapPosts(req: express.Request, res: express.Response): void {
		var qry = `SELECT p.post_id, p.address, p.name, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Post AS p LEFT OUTER JOIN Field AS f ON p.post_id = f.post_id LEFT OUTER JOIN FieldType AS ft ON f.field_id = ft.field_id LEFT OUTER JOIN Sport AS s ON s.sport_id = ft.sport_id GROUP BY p.post_id; `
        db.query( qry, function(err, results) {
			var miniPosts = [];
			for (let i = 0; i < results.length; i++) { 
				const miniPost = {
					post_id: results[i].post_id,
					address: results[i].address,
					title: results[i].name,
					sports: results[i].sports_names !== null ? results[i].sports_names.split(',') : [] 
					} as unknown as MiniPost;
				miniPosts[i] = miniPost; 
			}
			res.json(miniPosts)	
		});
	}

	/**
	 * Route used to let the user send a review for a specific post.
	 * User gives a rating between 0 and 5 with a comment
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	makeReview(req: express.Request, res: express.Response): void {
		if(req.session.userInfo == undefined){
			res.json({ success: false, errorMsg: "You are not connected"})
			return
		} 
		const user_id = req.session.userInfo.userid
		const comment = req.body.content
		const rating = req.body.rating
		db.query(`INSERT INTO Review VALUES(null, ${req.body.post_id}, (select r.renter_id FROM renter r JOIN user u ON r.user_id = u.user_id WHERE r.user_id = ${user_id}), "${comment}","${new Date().toLocaleDateString() + " " +  new Date().toLocaleTimeString()}", ${rating})`, (err, result) =>{
			if(err) {
				res.json({success: false, errorMsg: "Error with sql!"})
				return
			}
			res.json({succes: true, error: "No error"})
		})	
	}

	/**
	 * Route used to delete a post, since database tables are ON CASCADE, deleting a row in post-table is enough
	 * to delete every informations from other tables
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	deletepost(req: express.Request, res: express.Response) {
		if(req.session.userInfo == undefined){
			res.json({ success: false, errorMsg: "You are not connected"})
			return
		}
        var pid = req.body.postid
        db.query(`delete from post where post_id = ${pid};`, (err) => {
            if (err) {
				res.json({ success: false, errorMsg: "Error sql"})
				return
			}
            res.json({ success: true, errorMsg: "No error"})
        })
    }

	/**
	 * This route let a connected renter the ability to like or dislike a review
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	makeOpinion(req: express.Request, res: express.Response): void {
		if(req.session.userInfo === undefined) {
			res.json({"success": false, "errorMsg": "You are not connected or you are not a owner"})
			return
		} 
		const user_id = req.session.userInfo.userid
		const opinion = req.body.opinion
		const reviewid = req.body.review_id
		db.query(`INSERT INTO Opinion VALUES(${reviewid}, (select r.renter_id FROM renter r JOIN user u ON r.user_id = u.user_id WHERE r.user_id = ${user_id}), ${opinion})`,(err, result) => {
			if (err) {
				res.json({ success: false, errorMsg: "Error sql"})
				return
			}
			res.json({succes: true, error: "no error"})})
	}
}
