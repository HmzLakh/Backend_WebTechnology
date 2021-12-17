"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const express = require("express");
class BaseController {
    constructor(path) {
        this.router = express.Router();
        this.path = "/";
        this.path = path;
        this.initializeRoutes();
    }
}
exports.BaseController = BaseController;
//# sourceMappingURL=base.controller.js.map