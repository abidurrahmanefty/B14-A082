import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Book, BOOK_CATEGORIES, BookCategory } from "../models/Book";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const latest = req.query.latest
      ? parseInt(String(req.query.latest), 10)
      : null;

    if (latest && latest > 0) {
      const books = await Book.find()
        .sort({ createdAt: -1 })
        .limit(latest)
        .lean();
      res.json(books);
      return;
    }

    const books = await Book.find().sort({ createdAt: -1 }).lean();
    res.json(books);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid book id", 400);
    }
    const book = await Book.findById(id).lean();
    if (!book) {
      throw new AppError("Book not found", 404);
    }
    res.json(book);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        author,
        category,
        imageUrl,
        description,
        totalCopies,
      } = req.body;

      if (!title || !author || !category || !imageUrl || !description) {
        throw new AppError("All book fields are required", 400);
      }
      if (!BOOK_CATEGORIES.includes(category as BookCategory)) {
        throw new AppError("Invalid category", 400);
      }

      const copies = Math.max(1, parseInt(String(totalCopies || 1), 10) || 1);
      const user = req.user!;

      const book = await Book.create({
        title,
        author,
        category,
        imageUrl,
        description,
        addedByName: user.name,
        addedByEmail: user.email,
        totalCopies: copies,
        availableCopies: copies,
      });

      res.status(201).json(book);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid book id", 400);
      }

      const book = await Book.findById(id);
      if (!book) {
        throw new AppError("Book not found", 404);
      }
      if (book.addedByEmail !== req.user!.email) {
        throw new AppError("You can only edit your own books", 403);
      }

      const {
        title,
        author,
        category,
        imageUrl,
        description,
        totalCopies,
      } = req.body;

      if (title !== undefined) book.title = title;
      if (author !== undefined) book.author = author;
      if (category !== undefined) {
        if (!BOOK_CATEGORIES.includes(category as BookCategory)) {
          throw new AppError("Invalid category", 400);
        }
        book.category = category;
      }
      if (imageUrl !== undefined) book.imageUrl = imageUrl;
      if (description !== undefined) book.description = description;

      if (totalCopies !== undefined) {
        const newTotal = Math.max(1, parseInt(String(totalCopies), 10) || 1);
        const borrowed = book.totalCopies - book.availableCopies;
        book.totalCopies = newTotal;
        book.availableCopies = Math.max(0, newTotal - borrowed);
      }

      await book.save();
      res.json(book);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid book id", 400);
      }

      const book = await Book.findById(id);
      if (!book) {
        throw new AppError("Book not found", 404);
      }
      if (book.addedByEmail !== req.user!.email) {
        throw new AppError("You can only delete your own books", 403);
      }

      await book.deleteOne();
      res.json({ message: "Book deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
