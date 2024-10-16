const express = require("express");
const router = express.Router();
const upload = require("../MiddleWires/Upload");

/* Middlewire */
const authentication = require("../MiddleWires/Authentication");

/* Controller */
const {
  Registration,
  Login,
  GetUserDetails,
  EditUser,
} = require("../controllers/Routes_Controller/UserController");

/* Test route */
router.get("/", async (req, res) => {
  res.send("OPEN ROUTE: user routes tested");
});

/* Register - with image upload */
router.post("/register", upload.single("profilePicture"), Registration);

/* Login */
router.post("/login", Login);

/* Get User details : without password */
router.get("/user-details", authentication, GetUserDetails);

/* Edit User Details : along with image */
router.patch('/user-edit', authentication, upload.single('profilePicture'), EditUser);

module.exports = router;
