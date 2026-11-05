
// import { Router, Request, Response } from "express";
// import { ObjectId } from "mongodb";
// import { getDB } from "../config/db.js";
// import { verifyToken } from "../middlewares/verifyToken.js";

// const router = Router();

// const allowedCategories = [
//   "Fiction",
//   "Science",
//   "History",
//   "Kids",
//   "Others",
// ];

// // GET /books - Public: Get all books
// router.get("/", async (req: Request, res: Response) => {
//   try {
//     const db = getDB();
//     const limit = Number(req.query.limit);

//     let booksQuery = db
//       .collection("books")
//       .find()
//       .sort({ createdAt: -1 });

//     if (
//       req.query.limit !== undefined &&
//       Number.isInteger(limit) &&
//       limit > 0 &&
//       limit <= 100
//     ) {
//       booksQuery = booksQuery.limit(limit);
//     }

//     const books = await booksQuery.toArray();

//     return res.status(200).json({
//       success: true,
//       message: "Books fetched successfully",
//       data: books,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch books",
//     });
//   }
// });

// // GET /books/:id - Public: Get single book
// router.get("/:id", async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid book ID",
//       });
//     }

//     const db = getDB();

//     const book = await db.collection("books").findOne({
//       _id: new ObjectId(id),
//     });

//     if (!book) {
//       return res.status(404).json({
//         success: false,
//         message: "Book not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: book,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch book",
//     });
//   }
// });

// // POST /books - Protected: Add new book
// router.post("/", verifyToken, async (req: Request, res: Response) => {
//   try {
//     const user = res.locals.user as {
//       id: string;
//       email: string;
//       name?: string;
//     };

//     const {
//       title,
//       author,
//       category,
//       image,
//       description,
//       totalCopies,
//     } = req.body;

//     if (
//       typeof title !== "string" ||
//       !title.trim() ||
//       typeof author !== "string" ||
//       !author.trim() ||
//       !allowedCategories.includes(category) ||
//       typeof image !== "string" ||
//       !image.trim() ||
//       typeof description !== "string" ||
//       !description.trim() ||
//       !Number.isInteger(totalCopies) ||
//       totalCopies < 1
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide valid book information",
//       });
//     }

//     const db = getDB();

//     const newBook = {
//       title: title.trim(),
//       author: author.trim(),
//       category,
//       image: image.trim(),
//       description: description.trim(),
//       totalCopies,
//       availableCopies: totalCopies,
//       addedBy: {
//         name: user.name || user.email,
//         email: user.email.toLowerCase(),
//       },
//       createdAt: new Date(),
//     };

//     const result = await db.collection("books").insertOne(newBook);

//     return res.status(201).json({
//       success: true,
//       message: "Book added successfully",
//       data: {
//         ...newBook,
//         _id: result.insertedId,
//       },
//     });
//   } catch (error) {
//     console.error("Add book error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to add book",
//     });
//   }
// });

// // PATCH /books/:id - Protected: Owner only
// router.patch("/:id", verifyToken, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid book ID",
//       });
//     }

//     const user = res.locals.user as {
//       id: string;
//       email: string;
//       name?: string;
//     };

//     const allowedFields = [
//       "title",
//       "author",
//       "category",
//       "image",
//       "description",
//       "totalCopies",
//     ];

//     const updates: Record<string, unknown> = {};

//     for (const field of allowedFields) {
//       if (req.body[field] !== undefined) {
//         updates[field] = req.body[field];
//       }
//     }

//     if (Object.keys(updates).length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid fields provided for update",
//       });
//     }

//     for (const field of ["title", "author", "image", "description"]) {
//       if (
//         updates[field] !== undefined &&
//         (typeof updates[field] !== "string" ||
//           !(updates[field] as string).trim())
//       ) {
//         return res.status(400).json({
//           success: false,
//           message: `Invalid ${field}`,
//         });
//       }

//       if (typeof updates[field] === "string") {
//         updates[field] = (updates[field] as string).trim();
//       }
//     }

//     if (
//       updates.category !== undefined &&
//       !allowedCategories.includes(updates.category as string)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid book category",
//       });
//     }

//     if (
//       updates.totalCopies !== undefined &&
//       (!Number.isInteger(updates.totalCopies) ||
//         (updates.totalCopies as number) < 1)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid total copies",
//       });
//     }

//     const db = getDB();

//     const existingBook = await db.collection("books").findOne({
//       _id: new ObjectId(id),
//     });

//     if (!existingBook) {
//       return res.status(404).json({
//         success: false,
//         message: "Book not found",
//       });
//     }

//     if (
//       existingBook.addedBy?.email?.toLowerCase() !==
//       user.email.toLowerCase()
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "You are not allowed to update this book",
//       });
//     }

//     if (updates.totalCopies !== undefined) {
//       const borrowedCopies =
//         Number(existingBook.totalCopies ?? 0) -
//         Number(existingBook.availableCopies ?? 0);

//       if ((updates.totalCopies as number) < borrowedCopies) {
//         return res.status(400).json({
//           success: false,
//           message: "Total copies cannot be less than borrowed copies",
//         });
//       }

//       updates.availableCopies =
//         (updates.totalCopies as number) - borrowedCopies;
//     }

//     const result = await db.collection("books").updateOne(
//       {
//         _id: new ObjectId(id),
//         "addedBy.email": user.email.toLowerCase(),
//       },
//       { $set: updates }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(403).json({
//         success: false,
//         message: "You are not allowed to update this book",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Book updated successfully",
//       modifiedCount: result.modifiedCount,
//     });
//   } catch (error) {
//     console.error("Update book error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to update book",
//     });
//   }
// });

// // DELETE /books/:id - Protected: Owner only
// router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid book ID",
//       });
//     }

//     const user = res.locals.user as {
//       id: string;
//       email: string;
//       name?: string;
//     };

//     const db = getDB();

//     const result = await db.collection("books").deleteOne({
//       _id: new ObjectId(id),
//       "addedBy.email": user.email.toLowerCase(),
//     });

//     if (result.deletedCount === 0) {
//       const existingBook = await db.collection("books").findOne({
//         _id: new ObjectId(id),
//       });

//       if (!existingBook) {
//         return res.status(404).json({
//           success: false,
//           message: "Book not found",
//         });
//       }

//       return res.status(403).json({
//         success: false,
//         message: "You are not allowed to delete this book",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Book deleted successfully",
//     });
//   } catch (error) {
//     console.error("Delete book error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete book",
//     });
//   }
// });

// export default router;





import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

const allowedCategories = [
  "Fiction",
  "Science",
  "History",
  "Kids",
  "Others",
];

// GET /books - Public: Get all books
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const limit = Number(req.query.limit);

    let booksQuery = db
      .collection("books")
      .find()
      .sort({ createdAt: -1 });

    if (
      req.query.limit !== undefined &&
      Number.isInteger(limit) &&
      limit > 0 &&
      limit <= 100
    ) {
      booksQuery = booksQuery.limit(limit);
    }

    const books = await booksQuery.toArray();

    return res.status(200).json({
      success: true,
      message: "Books fetched successfully",
      data: books,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
});

// GET /books/:id - Public: Get single book
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const db = getDB();

    const book = await db.collection("books").findOne({
      _id: new ObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
});

// POST /books - Protected: Add new book
router.post("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const user = res.locals.user as {
      id: string;
      email: string;
      name?: string;
    };

    const {
      title,
      author,
      category,
      image,
      description,
      totalCopies,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof author !== "string" ||
      !author.trim() ||
      !allowedCategories.includes(category) ||
      typeof image !== "string" ||
      !image.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      !Number.isInteger(totalCopies) ||
      totalCopies < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid book information",
      });
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
        name: user.name || user.email,
        email: user.email.toLowerCase(),
      },
      createdAt: new Date(),
    };

    const result = await db.collection("books").insertOne(newBook);

    return res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: {
        ...newBook,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Add book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add book",
    });
  }
});

// PATCH /books/:id - Protected: Owner only
router.patch("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const user = res.locals.user as {
      id: string;
      email: string;
      name?: string;
    };

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
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    for (const field of ["title", "author", "image", "description"]) {
      if (
        updates[field] !== undefined &&
        (typeof updates[field] !== "string" ||
          !(updates[field] as string).trim())
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field}`,
        });
      }

      if (typeof updates[field] === "string") {
        updates[field] = (updates[field] as string).trim();
      }
    }

    if (
      updates.category !== undefined &&
      !allowedCategories.includes(updates.category as string)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid book category",
      });
    }

    if (
      updates.totalCopies !== undefined &&
      (!Number.isInteger(updates.totalCopies) ||
        (updates.totalCopies as number) < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid total copies",
      });
    }

    const db = getDB();

    const existingBook = await db.collection("books").findOne({
      _id: new ObjectId(id),
    });

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (
      existingBook.addedBy?.email?.toLowerCase() !==
      user.email.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this book",
      });
    }

    if (updates.totalCopies !== undefined) {
      const borrowedCopies =
        Number(existingBook.totalCopies ?? 0) -
        Number(existingBook.availableCopies ?? 0);

      if ((updates.totalCopies as number) < borrowedCopies) {
        return res.status(400).json({
          success: false,
          message: "Total copies cannot be less than borrowed copies",
        });
      }

      updates.availableCopies =
        (updates.totalCopies as number) - borrowedCopies;
    }

    const result = await db.collection("books").updateOne(
      {
        _id: new ObjectId(id),
        "addedBy.email": user.email.toLowerCase(),
      },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this book",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Update book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update book",
    });
  }
});

// DELETE /books/:id - Protected: Owner only
router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const user = res.locals.user as {
      id: string;
      email: string;
      name?: string;
    };

    const db = getDB();

    const result = await db.collection("books").deleteOne({
      _id: new ObjectId(id),
      "addedBy.email": user.email.toLowerCase(),
    });

    if (result.deletedCount === 0) {
      const existingBook = await db.collection("books").findOne({
        _id: new ObjectId(id),
      });

      if (!existingBook) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this book",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Delete book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete book",
    });
  }
});

export default router;
