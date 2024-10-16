const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For token generation
/* model */
const UserModel = require("../../Models/UserModel.js");
const cloudinary = require('../../Services/CloudinaryService.js');

/* helper functions */
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "user_profiles" },
      (error, result) => {
        if (error) {
          reject(new Error("Image upload failed"));
        } else {
          resolve(result.secure_url);
        }
      }
    ).end(fileBuffer);
  });
};

/*Registration Controller */
const Registration = async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // Input validation
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if the user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Image upload to Cloudinary
    let profilePictureUrl = "";
    if (req.file) {
      profilePictureUrl = await uploadToCloudinary(req.file.buffer);
    }

    // Create a new user
    const newUser = new UserModel({
      username,
      password, // The password will be hashed by the pre-save middleware (pre-save middleware--in schema)
      email,
      profilePicture: profilePictureUrl,
    });

    await newUser.save();
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    req.error = error;
    next();
  }
};

/* Login Controller */
const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Comparing the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generating JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expiration time
    );

    // Setting the JWT in a cookie
    res.cookie('token', token, {
      httpOnly: true, // Prevents JavaScript from accessing the cookie
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 3600000, // Cookie expiration time (1 hour)
      sameSite: 'strict', // CSRF protection
    });

    // Respond with user information (excluding password)
    return res.status(200).json({
      message: 'Login successful',
      token,//just for testing purposes
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    req.error = error;
    next();
  }
};

/* Fetching User Details Controller */
const GetUserDetails = async (req, res,next) => {
  try {
    const {id} = req.user;
    //excluding password
    let user = await UserModel.findOne({ _id: id }, "-password");
    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }
    return res.status(200).send({
      message: "User get sucessfully.",
      data: user,
    });
  } catch (error) {
    req.error = error;
    next();
  }
};

/* Edit User data */
const EditUser = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    // console.log(req.body);
    const {id} = req.user; 
    let profilePictureUrl;

    // Input validation
    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' });
    }

    // Check if the user exists or not
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.file) {
      try {

        // Delete the old profile picture if it exists
        if (user.profilePicture) {
          const oldPublicId = user.profilePicture.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`user_profiles/${oldPublicId}`);
        }
        //new profile picture upload
        profilePictureUrl = await uploadToCloudinary(req.file.buffer);
      } catch (error) {
        return res.status(500).json({ message: 'Failed to upload profile picture' });
      }
    }

    // Update the user details
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      {
        username,
        email,
        ...(profilePictureUrl && { profilePicture: profilePictureUrl }), // Update profile picture if new one is uploaded
      },
      { new: true, runValidators: true }
    ).select('-password');

    return res.status(200).json({
      message: 'User profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    req.error = error;
    next();
  }
};

module.exports = {
  Registration,
  Login,
  GetUserDetails,
  EditUser
};
