import * as express from 'express';
import { db } from '../db';









function get_owner_id(username,callback){
    db.query(`SELECT owner_id FROM Owner WHERE user_id = (SELECT user_id FROM User where username = "${username}")`, 
    (err, result, fields) => {
        if(err) throw err; 
        else {
            callback((result.length === 0) ? false : result[0].owner_id);
        }
    })
}
        

//callback is function with one argument: post_id,will be  a number if correct address, else it will be false
function get_post_id(address, callback){
    db.query(`SELECT post_id from Post where address = "${address}"`, 
    (err,result) => {
        if(err) throw err;
        else {
            console.log(result);
            callback((result.length === 0)? false : result[0].post_id)
        }
    });
}