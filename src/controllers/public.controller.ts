import * as express from 'express';
import { db } from '../db';
import { BaseController } from './base.controller';
import { Post } from '../models/post.model';

export class PublicController extends BaseController {

	constructor() {
		super("/public");
	}

	initializeRoutes(): void {
		this.router.get("/posts", this.getPosts.bind(this));
		this.router.get("/post/:postid", this.getPost.bind(this));
		this.router.get("/reviews/:postid", this.getReviews.bind(this));
	}

	/**
	 * Public route used in order to let external service get a single post using a post_id provided by /posts
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getPost(req: express.Request, res: express.Response): void {
		const postid = req.params.postid;
		var renter_id = 0
		var post = `SELECT p.post_id, owner_id, name, address, information, COALESCE(AVG(rating), 0) AS rating FROM Post AS p LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id WHERE p.post_id = ${postid} GROUP BY p.post_id; `
		var images = `SELECT image_url, post_id FROM Image AS i INNER JOIN ImagePost AS ip ON i.image_id = ip.image_id WHERE ip.post_id = ${postid}; `
		var fields = `SELECT f.post_id, f.field_id, f.name, f.price, f.recommended_number_of_persons, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Field AS f INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id WHERE f.post_id = ${postid} GROUP BY f.field_id;`
        db.query( post + images  + fields  ,[renter_id], function(err, results) {
			if (err) throw err;
			const post = {
				post_id: results[0][0].post_id,
				name: results[0][0].name,
				images: results[1],
				address: results[0][0].address,
				description: results[0][0].information,
				rating: results[0][0].rating,
				fields: results[2]
			} as Post
			res.json(post)
		});
	}

	/**
	 * Public route used to get every posts available in the database
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getPosts(req: express.Request, res: express.Response): void {
		const postid = req.params.postid;
		var renter_id = 0
		var post = "SELECT p.post_id, owner_id, name, address, information, COALESCE(AVG(rating), 0) AS rating FROM Post AS p LEFT OUTER JOIN Review AS r ON p.post_id = r.post_id GROUP BY p.post_id; "
		var images = "SELECT image_url, post_id FROM Image AS i INNER JOIN ImagePost AS ip ON i.image_id = ip.image_id; " 
		var fields = "SELECT f.post_id, f.field_id, f.name, f.price, f.recommended_number_of_persons, GROUP_CONCAT(DISTINCT s.sport_name) AS sports_names FROM Field AS f INNER JOIN FieldType AS ft ON ft.field_id = f.field_id INNER JOIN Sport AS s ON s.sport_id = ft.sport_id GROUP BY f.field_id;"
        db.query( post + images  + fields  ,[renter_id], function(err, results) {
			if (err) throw err;
			var posts = [];
			var icounter = 0;
			var scounter = 0;
			for (let i = 0; i < results[0].length; i++) {
				var addedImages = [];
				while (icounter < results[1].length && results[1][icounter].post_id == results[0][i].post_id) {
					addedImages.push(results[1][icounter].image_url);
					icounter++;
				}
				var addedfields = [];
				while (scounter < results[2].length && results[2][scounter].post_id == results[0][i].post_id) {
					addedfields.push(results[2][scounter]);
					scounter++;
				}
				const post = {
					post_id: results[0][i].post_id,
					name: results[0][i].name,
					images: addedImages,
					address: results[0][i].address,
					description: results[0][i].information,
					rating: results[0][i].rating,
					fields: addedfields
				} as Post; 
				posts[i] = post; 
			}
			res.json(posts)	
		});
	}

	/**
	 * Public route used to get a review with a specific post_id provided by /posts
	 * 
	 * @param {express.Request} req Express request
	 * @param {express.Response} res Express response
	 * @returns {void} Nothing
	 */
	getReviews(req: express.Request, res: express.Response): void {
		const postid = req.params.postid;
		var qryReviews =  `SELECT r.post_id, u.username, r.content, r.date_time, r.rating, COALESCE(SUM(o.opinion), 0) AS votes FROM Review AS r INNER JOIN Post AS p ON p.post_id = r.post_id INNER JOIN Renter AS re ON r.renter_id = re.renter_id INNER JOIN User AS u ON u.user_id = re.user_id LEFT OUTER JOIN ImageUser AS iu ON iu.user_id = re.user_id LEFT OUTER JOIN Image AS i ON i.image_id = iu.image_id  LEFT OUTER JOIN Opinion AS o ON o.review_id = r.review_id WHERE r.post_id = ${postid} GROUP BY r.review_id ORDER BY p.post_id ASC;`
        db.query(qryReviews,[], function(err, results) {
			if (err) throw err;
			res.json(results)	
		});
	}
}