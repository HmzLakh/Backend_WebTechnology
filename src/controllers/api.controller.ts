import * as express from 'express';
import { db } from '../db';
import { BaseController } from './base.controller';
import { Post } from '../models/post.model';
import { MiniPost } from '../models/mini.post.model';

export class ApiController extends BaseController {

    constructor() {
        super("/api");
    }

    initializeRoutes(): void {
        // GET /api
		this.router.get("", this.get.bind(this));
		this.router.get("/getPost", this.getPost.bind(this));
		this.router.get("/getPosts", this.getPosts.bind(this));
		this.router.put("/editPost", this.editPost.bind(this));
		this.router.put("/editFields", this.editPost.bind(this));
	 	
    }


	get(req: express.Request, res: express.Response): void {
		res.status(200).json({
			"success": true
		})
	}
	getPost(req: express.Request, res: express.Response): void {
		var postId = req.body.post_id
		var renter_id = req.body.renter_id //if logged
		var post = "SELECT p.post_id, owner_id, name, address, information, AVG(rating) FROM Post AS p INNER JOIN Review AS r ON p.post_id = r.post_id WHERE p.post_id = ? GROUP BY p.post_id; "
		var images = "SELECT image_url FROM Image AS i INNER JOIN ImagePost AS ip ON i.image_id = ip.image_id WHERE post_id = ?; "
		var sports = "SELECT DISTINCT sport_name FROM Post AS p INNER JOIN Field AS f ON f.post_id = p.post_id INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE p.post_id = ?; "
		var reviews = "SELECT r.review_id, r.renter_id, r.content, r.date_time, r.rating, SUM(O.opinion) AS votes , n.votedby FROM Review AS r INNER JOIN Post AS p ON p.post_id = r.post_id INNER JOIN Renter AS re ON r.renter_id = re.renter_id INNER JOIN ImageUser AS iu ON iu.user_id = re.user_id INNER JOIN Image AS i ON i.image_id = iu.image_id  LEFT OUTER JOIN Opinion AS o ON o.review_id = r.review_id LEFT OUTER JOIN (SELECT r2.review_id, o2.opinion AS votedby FROM Opinion AS o2 INNER JOIN Review AS r2 ON r2.review_id = o2.review_id WHERE o2.renter_id = ?  GROUP BY r2.review_id) AS n ON r.review_id = n.review_id WHERE p.post_id = ? GROUP BY r.review_id ORDER BY votes DESC; "
		var fields = "SELECT f.field_id, f.name, f.price, f.max_number_of_persons, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Field AS f INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE f.post_id = ? GROUP BY f.field_id;"
        db.query(post + images + sports+ reviews + fields  ,[postId, postId, postId, renter_id, postId, postId], function(err, results) {
			if (err) throw err;
			const post = {
				"post_id": postId,
				"name": results[0].name,
    			"images": results[1],
   				"address": results[0].address,
   				"description": results[0].information,
				"sports": results[2],
    			"rating": results[0].rating,
    			"reviews": results[3],
				"fields": results[4]
				} as Post; 

				res.json({
					"post": post
				}
				)	
		  });
	}
	
	getPosts(req: express.Request, res: express.Response): void {
		var qry = "SELECT p.post_id, o.owner_id, p.name, u.username, AVG(r.rating) AS rating,GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names, i.image_url FROM Post AS p INNER JOIN Owner AS o ON p.owner_id = o.owner_id INNER JOIN User AS u ON o.user_id = u.user_id LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id LEFT OUTER JOIN Field AS f ON p.post_id = f.post_id LEFT OUTER JOIN FieldType AS ft ON f.field_id = ft.field_id LEFT OUTER JOIN Sport AS s ON s.sport_id = ft.sport_id LEFT OUTER JOIN ImagePost AS ip ON p.post_id = ip.post_id INNER JOIN Image AS i ON ip.image_id = i.image_id WHERE incr_id = 1  GROUP BY p.post_id;" 
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
			const maxNumberOfPersons = field.max_number_of_persons
			const deletedSports = field.deletedSports
			const addedSports = field.addedSports
			qryUpdate += `UPDATE Field SET name = ${name}, price = ${price}, max_number_of_persons = ${maxNumberOfPersons} WHERE post_id = ${postId} AND field_id = ${fieldId}; `
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
