import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BorrowStatus = "active" | "returned";

export interface IBorrow extends Document {
  bookId: Types.ObjectId;
  bookTitle: string;
  bookImage: string;
  userEmail: string;
  borrowDate: Date;
  returnDate: Date;
  status: BorrowStatus;
  createdAt: Date;
  updatedAt: Date;
}

const borrowSchema = new Schema<IBorrow>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    bookTitle: { type: String, required: true },
    bookImage: { type: String, required: true },
    userEmail: { type: String, required: true, lowercase: true },
    borrowDate: { type: Date, required: true, default: Date.now },
    returnDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "returned"],
      default: "active",
    },
  },
  { timestamps: true }
);

borrowSchema.index({ bookId: 1, userEmail: 1, status: 1 });

export const Borrow: Model<IBorrow> =
  mongoose.models.Borrow || mongoose.model<IBorrow>("Borrow", borrowSchema);
