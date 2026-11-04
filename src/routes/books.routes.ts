
import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const router = Router();

// GET /books - Get all books

router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDB();

    const limit = Number(req.query.limit);

    let booksQuery = db
      .collection("books")
      .find()
      .sort({ createdAt: -1 });

    // Apply limit only when a valid limit is provided
    if (
      req.query.limit !== undefined &&
      Number.isInteger(limit) &&
      limit > 0 &&
      limit <= 100
    ) {
      booksQuery = booksQuery.limit(limit);
    }

    const books = await booksQuery.toArray();

    res.status(200).json({
      success: true,
      message: "Books fetched successfully",
      data: books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
});


// GET /books/:id - Get single book
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const db = getDB();

    const book = await db.collection("books").findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
});

// POST /books - Add new book
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      title,
      author,
      category,
      image,
      description,
      totalCopies,
      addedBy,
    } = req.body;

    if (
      !title?.trim() ||
      !author?.trim() ||
      !category ||
      !image?.trim() ||
      !description?.trim() ||
      !Number.isInteger(totalCopies) ||
      totalCopies < 1 ||
      !addedBy?.name?.trim() ||
      !addedBy?.email?.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide valid book information",
      });
      return;
    }

    const allowedCategories = [
      "Fiction",
      "Science",
      "History",
      "Kids",
      "Others",
    ];

    if (!allowedCategories.includes(category)) {
      res.status(400).json({
        success: false,
        message: "Invalid book category",
      });
      return;
    }

    const db = getDB();

    const newBook = {
      title: title.trim(),
      author: author.trim(),
      category,
      image: image.trim(),
      description: description.trim(),
      totalCopies,
      availableCopies: totalCopies,
      addedBy: {
        name: addedBy.name.trim(),
        email: addedBy.email.trim().toLowerCase(),
      },
      createdAt: new Date(),
    };

    const result = await db.collection("books").insertOne(newBook);

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: {
        ...newBook,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add book",
    });
  }
});

// PATCH /books/:id - Update book
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const allowedFields = [
      "title",
      "author",
      "category",
      "image",
      "description",
      "totalCopies",
    ];

    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
      return;
    }

    if (
      updates.totalCopies !== undefined &&
      (!Number.isInteger(updates.totalCopies) ||
        (updates.totalCopies as number) < 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid total copies",
      });
      return;
    }

    const db = getDB();

    const existingBook = await db.collection("books").findOne({
      _id: new ObjectId(id),
    });

    if (!existingBook) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    if (updates.totalCopies !== undefined) {
      const borrowedCopies =
        Number(existingBook.totalCopies ?? 0) -
        Number(existingBook.availableCopies ?? 0);

      if ((updates.totalCopies as number) < borrowedCopies) {
        res.status(400).json({
          success: false,
          message: "Total copies cannot be less than borrowed copies",
        });
        return;
      }

      updates["availableCopies"] =
        (updates.totalCopies as number) - borrowedCopies;
    }

    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update book",
    });
  }
});

// DELETE /books/:id - Delete book
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const db = getDB();

    const result = await db.collection("books").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete book",
    });
  }
});

export default router;
