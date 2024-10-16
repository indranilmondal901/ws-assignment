const express = require("express");
const router = express.Router();
const upload = require("../MiddleWires/Upload");

/* Middlewire */
const authentication = require("../MiddleWires/Authentication");

/* Controller */
const {
    AddQuestion,
    GetCategoryWiseQuestions,
    BulkAddQuestions
} = require("../controllers/Routes_Controller/QuestionController");

/* Test route */
router.get("/", async (req, res) => {
  res.send("OPEN ROUTE: Question routes tested");
});

/* add single question */
router.post("/add-single-question", authentication, AddQuestion);

/* get category wise questions -- can search or can get all question category wise*/
router.get("/category-wise-question", authentication, GetCategoryWiseQuestions);

/* Bulk question addition with Excel or CSV */
router.post("/bulk-add-question", authentication, upload.single("file"), BulkAddQuestions);



module.exports = router;
