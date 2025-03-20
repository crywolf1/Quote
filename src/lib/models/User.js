import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  quotes: [
    {
      type: String,
      required: false,
    },
  ],
  avatar: {
    type: String,
    required: false,
  },
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
