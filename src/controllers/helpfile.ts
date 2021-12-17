
import * as express from 'express';
function test(req: express.Request, res: express.Response): void {
    console.log(typeof req.body.boolean)
}

export {test}