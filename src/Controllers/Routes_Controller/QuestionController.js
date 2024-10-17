const mongoose = require("mongoose");

const csv = require("csv-parser");
const xlsx = require("xlsx");
const fs = require("fs");

const QuestionModel = require("../../Models/QuestionModel");
const CategoryModel = require("../../Models/CategoryModel");

// Helper function to process questions and save them in the database
const processQuestions = async (questions, createdBy, categoriesMap, res) => {
  try {
    for (const question of questions) {
      const { questionText, categories } = question;

      if (!questionText || !categories) {
        continue; // Skip rows with missing data
      }

      const categoryIds = [];
      const categoryNames = categories
        .split(",")
        .map((cat) => cat.trim().toUpperCase());

      for (const name of categoryNames) {
        if (categoriesMap.has(name)) {
          categoryIds.push(categoriesMap.get(name));
        } else {
          let category = await CategoryModel.findOne({ name });
          if (!category) {
            category = new CategoryModel({ name });
            await category.save();
          }
          categoriesMap.set(name, category._id);
          categoryIds.push(category._id);
        }
      }

      // Save the question
      const newQuestion = new QuestionModel({
        createdBy,
        questionText,
        categories: categoryIds,
      });
      await newQuestion.save();
    }

    res.status(200).json({
      message: "Questions added successfully",
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("Error in processQuestions:", error);
    res.status(500).json({ message: "Error processing questions" });
  }
};

const AddQuestion = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { questionText, categories } = req.body;
    // console.log({ questionText, categories });

    // input validation
    if (!questionText || !categories || !Array.isArray(categories)) {
      return res
        .status(400)
        .json({ message: "Question text and categories are required" });
    }

    // Convert categories to uppercase and find existing ones
    const upperCaseCategories = categories.map((name) => name.toUpperCase());

    // Use aggregation to find existing categories
    const existingCategories = await CategoryModel.aggregate([
      { $match: { name: { $in: upperCaseCategories } } },
      { $project: { _id: 1, name: 1 } },
    ]);

    // Find categories that need to be created
    const existingCategoryNames = existingCategories.map((cat) => cat.name);
    const categoriesToCreate = upperCaseCategories.filter(
      (cat) => !existingCategoryNames.includes(cat)
    );

    //Insert new categories if any mnew categoriy is present
    let newCategories = [];
    if (categoriesToCreate.length > 0) {
      newCategories = await CategoryModel.insertMany(
        categoriesToCreate.map((name) => ({ name }))
      );
    }

    // Combine existing and newly created categories' IDs
    const allCategoryIds = [
      ...existingCategories.map((cat) => cat._id),
      ...newCategories.map((cat) => cat._id),
    ];

    // Step 4: Create a new question with the associated category IDs
    const newQuestion = new QuestionModel({
      createdBy: id,
      questionText,
      categories: allCategoryIds,
    });

    await newQuestion.save();

    return res
      .status(201)
      .json({ message: "Question added successfully", question: newQuestion });
  } catch (error) {
    req.error = error;
    next();
  }
};

const GetCategoryWiseQuestions = async (req, res, next) => {
  try {
    const { id } = req.user; // `createdBy` user ID
    const { categoryName } = req.query; // category name from query parameters

    // console.log("User ID:", id, "Category Filter:", categoryName);

    // Building pipline
    const pipeline = [
      // Match questions created by the user (so taht one can see his own questions)
      { $match: { createdBy: new mongoose.Types.ObjectId(id) } },

      // Lookup -- to join categories -- category m find
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },

      // Unwind the categories array for grouping
      { $unwind: "$categoryDetails" },
    ];

    // If a specific category is provided
    if (categoryName) {
      pipeline.push({
        $match: { "categoryDetails.name": categoryName.toUpperCase() },
      });
    }

    //Group by category name
    pipeline.push({
      $group: {
        _id: "$categoryDetails.name", //basis of group -- category name r aginst e
        questions: { $push: { _id: "$_id", text: "$questionText" } },
      },
    });

    // Project -- field that I want to show
    pipeline.push({
      $project: {
        categoryName: "$_id",
        questions: 1,
      },
    });

    pipeline.push({ $sort: { categoryName: 1 } });

    // Execution
    const categoryWiseQuestions = await QuestionModel.aggregate(pipeline);

    return res.status(200).json({
      message: "Category-wise questions retrieved successfully",
      data: categoryWiseQuestions,
    });
  } catch (error) {
    console.error("Error in GetCategoryWiseQuestions:", error);
    req.error = error;
    next();
  }
};

const BulkAddQuestions = async (req, res, next) => {
  try {
    // console.log("add questions in process...");
    const { id: createdBy } = req.user; // The logged-in user who is creating the questions
    const { file } = req; // Access the uploaded file

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const questions = [];
    const categoriesMap = new Map();

    // Determine the file type based on its mime type
    if (file.mimetype === "text/csv") {
      //   console.log("CSV file detected");
      // CSV file parsing
      // Create a readable stream from the buffer
      const bufferStream = require("stream").Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      bufferStream
        .pipe(csv())
        .on("data", (row) => {
          questions.push(row);
        })
        .on("end", async () => {
          await processQuestions(questions, createdBy, categoriesMap, res);
        });
    } else if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      //   console.log("Excel file detected");
      // Excel file parsing
      const workbook = xlsx.read(file.buffer);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      //   console.log(data);
      questions.push(...data);
      await processQuestions(questions, createdBy, categoriesMap, res);
    } else {
      return res.status(400).json({ message: "Unsupported file format" });
    }
  } catch (error) {
    console.error("Error in BulkAddQuestions:", error);
    req.error = error;
    next();
  }
};

module.exports = { AddQuestion, GetCategoryWiseQuestions, BulkAddQuestions };
