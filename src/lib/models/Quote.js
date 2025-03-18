import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    maxLength: 320,
  },
});

const Quote = mongoose.models.Quote || mongoose.model("Quote", quoteSchema);

export default Quote;
