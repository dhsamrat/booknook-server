
import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const router = Router();

// POST /borrows - Borrow a book
router.post("/", async (req: Request, res: Response) => {
  let reservedCopy = false;
  let borrowInserted = false;
  let bookId: ObjectId | null = null;

  try {
    const { bookId: requestedBookId, userName, userEmail, borrowDate, returnDate } = req.body;

    if (
      !ObjectId.isValid(requestedBookId) ||
      !userName?.trim() ||
      !userEmail?.trim() ||
      !borrowDate ||
      !returnDate
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide valid borrowing information",
      });
      return;
    }

    const startDate = new Date(borrowDate);
    const endDate = new Date(returnDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide valid borrow and return dates",
      });
      return;
    }

    const db = getDB();
    const booksCollection = db.collection("books");
    const borrowsCollection = db.collection("borrows");

    bookId = new ObjectId(requestedBookId);
    const email = userEmail.trim().toLowerCase();

    // Prevent duplicate active borrowing
    await borrowsCollection.createIndex(
      { bookId: 1, userEmail: 1 },
      { unique: true }
    );

    const existingBorrow = await borrowsCollection.findOne({
      bookId,
      userEmail: email,
    });

    if (existingBorrow) {
      res.status(409).json({
        success: false,
        message: "You have already borrowed this book",
      });
      return;
    }

    const book = await booksCollection.findOne({ _id: bookId });

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    // Decrease available copies atomically
    const updateResult = await booksCollection.updateOne(
      {
        _id: bookId,
        availableCopies: { $gt: 0 },
      },
      {
        $inc: { availableCopies: -1 },
      }
    );

    if (updateResult.modifiedCount === 0) {
      res.status(400).json({
        success: false,
        message: "No copies available for borrowing",
      });
      return;
    }

    reservedCopy = true;

    const newBorrow = {
      bookId,
      bookTitle: book.title,
      bookImage: book.image,
      userName: userName.trim(),
      userEmail: email,
      borrowDate: startDate,
      returnDate: endDate,
      createdAt: new Date(),
    };

    await borrowsCollection.insertOne(newBorrow);
    borrowInserted = true;

    res.status(201).json({
      success: true,
      message: "Book borrowed successfully",
      data: newBorrow,
    });
  } catch (error: any) {
    // Restore the copy if inserting the borrow record failed
    if (reservedCopy && !borrowInserted && bookId) {
      await getDB().collection("books").updateOne(
        { _id: bookId },
        { $inc: { availableCopies: 1 } }
      );
    }

    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        message: "You have already borrowed this book",
      });
      return;
    }

    console.error("Borrow error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to borrow book",
    });
  }
});

// GET /borrows - Get borrow records
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDB();

    const userEmail = req.query.email?.toString().trim().toLowerCase();

    const filter = userEmail
      ? { userEmail }
      : {};

    const borrows = await db
      .collection("borrows")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Borrow records fetched successfully",
      data: borrows,
    });
  } catch (error) {
    console.error("Fetch borrows error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch borrow records",
    });
  }
});

// DELETE /borrows/:id - Return a borrowed book
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid borrow ID",
      });
      return;
    }

    const db = getDB();
    const borrowsCollection = db.collection("borrows");
    const booksCollection = db.collection("books");

    const borrowId = new ObjectId(id);

    // Delete first, so the same borrow cannot be returned twice
    const deletedBorrow = await borrowsCollection.findOneAndDelete({
      _id: borrowId,
    });

    if (!deletedBorrow) {
      res.status(404).json({
        success: false,
        message: "Borrow record not found",
      });
      return;
    }

    const updateResult = await booksCollection.updateOne(
      { _id: deletedBorrow.bookId },
      { $inc: { availableCopies: 1 } }
    );

    if (updateResult.matchedCount === 0) {
      // Restore the borrow record if the book is missing
      await borrowsCollection.insertOne(deletedBorrow);

      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Book returned successfully",
    });
  } catch (error) {
    console.error("Return error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to return book",
    });
  }
});

export default router;
