import * as express from 'express';
import { db } from '../db';
//--------------------------------------------------------------------------MAKE POST------------------------------------------------------

// MakePost 
// In:
// Name: string
// Address: string 
// Information: idk
// username: string
// sports: array

// Out: 
// Address_already_in_use: boolean 
// valid_username: boolean   //user is  an owner
// succes: boolean

//TODO foreach addimagepost !!!
function makePost(req: express.Request, res: express.Response): void {
    const InsertObject = {
        ownerID: null,     //must be set to a number or false by get_user_id procedure   
        address_already_in_use: null,
        valid_username: null,	 //owner name


        set_valid_username: function (ownerID_from_username) {
            if (ownerID_from_username === false) this.valid_username = false;  //HIER
            else { this.ownerID = ownerID_from_username; this.valid_username = true; }
            this.insert();
        },

        set_address_in_use: function (postID_from_address) {
            if (postID_from_address === false) {
                this.address_already_in_use = false;
            }
            else {
                this.address_already_in_use = true;
            }
            this.insert();
        },

        first_fn: function () {
            get_owner_id(req.body.username, InsertObject.set_valid_username.bind(this));
        },

        second_fn: function () {
            get_post_id(req.body.address, InsertObject.set_address_in_use.bind(this));
        },

        insert: function () {
            //in this case the data is correct and we can insert into the database
            if (this.address_already_in_use === false && this.valid_username === true) {
                db.query(`INSERT INTO Post VALUES(null, "${req.body.name}", "${req.body.address}", "${req.body.information}", ${this.ownerID})`,
                    (err, result) => {
                        if (err) throw err;
                        res.json({
                            addres_already_in_use: this.address_already_in_use,
                            valid_usernam: this.valid_username,
                            succes: true
                        })
                    }
                )
            }
            //in this case either the address will be already used and/or the username is not valid`
            else if (!(this.address_already_in_use === null) && !(this.valid_username === null)) {
                res.json({
                    address_already_in_use: this.address_already_in_use,
                    valid_username: this.valid_username,
                    succes: false
                })
            }

        }

    };

    InsertObject.first_fn()
    InsertObject.second_fn()

}

//callback is function with one argument: the owner_id: will be a number if correct username, else it will be false.
function get_owner_id(username, callback) {
    db.query(`SELECT owner_id FROM Owner WHERE user_id = (SELECT user_id FROM User where username = "${username}")`,
        (err, result, fields) => {
            if (err) throw err;
            else {
                callback((result.length === 0) ? false : result[0].owner_id);
            }
        })
}


//callback is function with one argument: post_id,will be  a number if correct address, else it will be false
function get_post_id(address, callback) {
    db.query(`SELECT post_id from Post where address = "${address}"`,
        (err, result) => {
            if (err) throw err;
            else {
                callback((result.length === 0) ? false : result[0].post_id)
            }
        });
}

// AddImagePost
// In: 
// image_url  word image_id en IMAGE_URL BESTAAT AL IN DATABASE
// post_address
// Main: als true --> main foto 

// Out: 
// valid_post_address: boolean 
// succes : boolean 

//check eerst of post_address een geldige post adress is en of image nog niet al in gebruik is  zoja insert in image table EN imagepost table
var counter = 0;
function AddImagePost(req: express.Request, res: express.Response): void {
    const InsertObject = {
        post_ID: null,               //will be assigned to a number or false

        insert: function () {
            if ((typeof this.post_ID) === "number") {
                db.query(`INSERT INTO Image VALUES ("${req.body.image_url}", null)`,
                    (err, result) => {
                        if (err) throw err;
                        else {
                            console.log("result", result)
                            const image_id = result.insertId
                            counter++;
                            db.query(`INSERT INTO ImagePost VALUES(${image_id}, ${this.post_ID},${counter} )`,
                                (err, result) => { if (err) throw err; })
                        }
                    }
                )
            }
            else {
                res.json({
                    valid_post_address: false,
                    succes: false
                })
            }
        },


        check_address_get_post_ID: function () {
            get_post_id(req.body.post_address, (postID) => { this.post_ID = postID; this.insert(); })
        }


    }
    InsertObject.check_address_get_post_ID();
}



// addField
// In: 
// address OF PostID
// name   //van veld! bvb L123 
// Price
// max_number_of_persons
// sports //sws 

// Out: 
// name_already_exists: boolean 
// valid_post_address: boolean 
// Succes: boolean
function addField(req: express.Request, res: express.Response): void {
    const InsertObject = {
        post_ID: null,
        name_already_exists: null,
        insert: function () {
            if (typeof this.post_ID === "number" && this.name_already_exists === false) {
                db.query(`INSERT INTO Field Values(null, ${this.post_ID}, "${req.body.name}" , ${req.body.price}, ${req.body.max_number_of_persons})`,
                    (err, results) => {
                        if (err) throw err;
                        res.json({
                            name_already_exists: false,
                            valid_post_address: true,
                            succes: true

                        })
                    })
            }
            else if (!(this.post_ID === null) && !(this.name_already_exists === null)) {
                res.json({
                    name_already_exists: this.name_already_exists,
                    valid_post_address: !(this.post_ID === false),
                    succes: false
                })

            }
        },

        set_post_id: function () {
            get_post_id(req.body.address,
                (postID) => { this.post_ID = postID; this.insert() })
        },

        set_name_exists: function () {
            db.query(`SELECT COUNT(*) as matching_name FROM Field WHERE name = "${req.body.name}"`,
                (err, result) => {
                    if (err) throw err;
                    else {
                        this.name_already_exists = result[0].matching_name > 0
                        this.insert();
                    }
                })         
        },

        start: function () {
            this.set_post_id()
            this.set_name_exists()
        }
    }
    InsertObject.start();
}

// //aaddsports
// //in: fieldID, sports_array 
// //out: invalid
// function addSports(fieldID, sports) {
//     var invalidSports = []
//     sports.forEach(sport, i) => 
//     {
//         addSport(fieldID,sport, (invalidsport) =>{ console.log("invalid: ", sport); invalidSports.push[invalidsport]});


//     }


// }

// function addSport(fieldID, sport, callback) {
//     db.query(`SELECT COUNT(*) as matching_sport FROM Sport WHERE Sport_name = "${sport}"`,
//         (err, result) => {
//             if (err) throw err;
//             else {
//                 if (result[0].matching_sport === 0){  callback(sport);}
//                 else db.query(`INSERT IGNORE INTO FieldType VALUES((SELECT Sport_id FROM Sport WHERE Sport_name = "${sport}") , ${fieldID})`,  //ignore --> als er al een row is word er niet opnieuw geinsert
//                     (err, result) => {
//                         if (err) throw err;
//                     })
//             }
//         })
// }


export { makePost, AddImagePost, addField, }


function createPost(req: express.Request, res: express.Response): void {
    if(req.session.userInfo && !req.session.userInfo.is_owner){
        res.json({"success": false, "errorMsg": "You are not connected or you are not a owner"})
        return
    }
    const name = req.body.name
    const address = req.body.address
    const description = req.body.description
    const thumbnail_id = req.body.thumbnail_id
    const images_id_array = req.body.images
    const fields_array = req.body.fields
    if(name == undefined || address == undefined || description == undefined || thumbnail_id == undefined || fields_array == undefined || images_id_array == undefined){
        res.json({"success": false, "errorMsg": "Invalid form!"})
        return
    }

    

}