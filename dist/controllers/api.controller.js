"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiController = void 0;
const base_controller_1 = require("./base.controller");
class ApiController extends base_controller_1.BaseController {
    constructor() {
        super("/api");
    }
    initializeRoutes() {
        // GET /api
        this.router.get("", this.get.bind(this));
    }
    /**
     * GET request for the user controller. Despite being named "get" you can
     * name this function whatever you want (e.g. getUser, ...).
     *
     * @param {express.Request} req The GET request
     * @param {express.Response} res The response to the request
     */
    get(req, res) {
        res.status(200).json({
            "success": true
        });
    }
    /**
     * Check if a string is actually provided
     *
     * @param {string} param Provided string
     * @returns {boolean} Valid or not
     */
    _isGiven(param) {
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
    _isEmailValid(email) {
        const atIdx = email.indexOf("@");
        const dotIdx = email.indexOf(".");
        return atIdx != -1 && dotIdx != -1 && dotIdx > atIdx;
    }
}
exports.ApiController = ApiController;
//# sourceMappingURL=api.controller.js.map