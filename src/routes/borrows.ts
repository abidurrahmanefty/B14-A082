import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Book } from "../models/Book";
import { Borrow } from "../models/Borrow";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { addBorrowDays } from "../utils/dates";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const borrows = await Borrow.find({
      userEmail: req.user!.email,
      status: "active",
    })
      .sort({ borrowDate: -1 })
      .lean();
    res.json(borrows);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookId } = req.body;
    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      throw new AppError("Valid book id is required", 400);
    }

    const userEmail = req.user!.email;

    const existing = await Borrow.findOne({
      bookId,
      userEmail,
      status: "active",
    });
    if (existing) {
      throw new AppError("You already borrowed this book", 409);
    }

    const book = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );

    if (!book) {
      const exists = await Book.findById(bookId);
      if (!exists) {
        throw new AppError("Book not found", 404);
      }
      throw new AppError("This book is not available to borrow", 400);
    }

    const borrowDate = new Date();
    const returnDate = addBorrowDays(borrowDate);

    const borrow = await Borrow.create({
      bookId: book._id,
      bookTitle: book.title,
      bookImage: book.imageUrl,
      userEmail,
      borrowDate,
      returnDate,
      status: "active",
    });

    res.status(201).json(borrow);
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid borrow id", 400);
      }

      const borrow = await Borrow.findById(id);
      if (!borrow) {
        throw new AppError("Borrow record not found", 404);
      }
      if (borrow.userEmail !== req.user!.email) {
        throw new AppError("You can only return your own borrows", 403);
      }
      if (borrow.status === "returned") {
        throw new AppError("This book was already returned", 400);
      }

      borrow.status = "returned";
      await borrow.save();

      await Book.findByIdAndUpdate(borrow.bookId, {
        $inc: { availableCopies: 1 },
      });

      res.json({ message: "Book returned successfully", borrow });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
