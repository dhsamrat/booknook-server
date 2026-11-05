
// import { Router, Request, Response } from "express";
// import { ObjectId } from "mongodb";
// import { getDB } from "../config/db.js";
// import { verifyToken } from "../middlewares/verifyToken.js";

// const router = Router();

// // POST /borrows - Borrow a book (Protected)
// router.post("/", verifyToken, async (req: Request, res: Response) => {
//   let reservedCopy = false;
//   let borrowInserted = false;
//   let bookId: ObjectId | null = null;

//   try {
//     const { bookId: requestedBookId, borrowDate, returnDate } = req.body;

//     // Get authenticated user from JWT
//     const user = res.locals.user as {
//       id: string;
//       email: string;
//       name?: string;
//     };

//     const userEmail = user.email?.trim().toLowerCase();
//     const userName = user.name?.trim() || userEmail;

//     if (
//       !ObjectId.isValid(requestedBookId) ||
//       !userEmail ||
//       !borrowDate ||
//       !returnDate
//     ) {
//       res.status(400).json({
//         success: false,
//         message: "Please provide valid borrowing information",
//       });
//       return;
//     }

//     const startDate = new Date(borrowDate);
//     const endDate = new Date(returnDate);

//     if (
//       Number.isNaN(startDate.getTime()) ||
//       Number.isNaN(endDate.getTime()) ||
//       endDate <= startDate
//     ) {
//       res.status(400).json({
//         success: false,
//         message: "Please provide valid borrow and return dates",
//       });
//       return;
//     }

//     const db = getDB();
//     const booksCollection = db.collection("books");
//     const borrowsCollection = db.collection("borrows");

//     bookId = new ObjectId(requestedBookId);

//     // Prevent duplicate active borrowing
//     await borrowsCollection.createIndex(
//       { bookId: 1, userEmail: 1 },
//       { unique: true }
//     );

//     const existingBorrow = await borrowsCollection.findOne({
//       bookId,
//       userEmail,
//     });

//     if (existingBorrow) {
//       res.status(409).json({
//         success: false,
//         message: "You have already borrowed this book",
//       });
//       return;
//     }

//     const book = await booksCollection.findOne({ _id: bookId });

//     if (!book) {
//       res.status(404).json({
//         success: false,
//         message: "Book not found",
//       });
//       return;
//     }

//     // Decrease available copies atomically
//     const updateResult = await booksCollection.updateOne(
//       {
//         _id: bookId,
//         availableCopies: { $gt: 0 },
//       },
//       {
//         $inc: { availableCopies: -1 },
//       }
//     );

//     if (updateResult.modifiedCount === 0) {
//       res.status(400).json({
//         success: false,
//         message: "No copies available for borrowing",
//       });
//       return;
//     }

//     reservedCopy = true;

//     const newBorrow = {
//       bookId,
//       bookTitle: book.title,
//       bookImage: book.image,
//       userName,
//       userEmail,
//       borrowDate: startDate,
//       returnDate: endDate,
//       createdAt: new Date(),
//     };

//     await borrowsCollection.insertOne(newBorrow);
//     borrowInserted = true;

//     res.status(201).json({
//       success: true,
//       message: "Book borrowed successfully",
//       data: newBorrow,
//     });
//   } catch (error: any) {
//     // Restore copy if borrow insertion fails
//     if (reservedCopy && !borrowInserted && bookId) {
//       try {
//         await getDB().collection("books").updateOne(
//           { _id: bookId },
//           { $inc: { availableCopies: 1 } }
//         );
//       } catch (rollbackError) {
//         console.error("Copy restoration error:", rollbackError);
//       }
//     }

//     if (error?.code === 11000) {
//       res.status(409).json({
//         success: false,
//         message: "You have already borrowed this book",
//       });
//       return;
//     }

//     console.error("Borrow error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to borrow book",
//     });
//   }
// });

// // GET /borrows - Get only logged-in user's borrow records (Protected)
// router.get("/", verifyToken, async (_req: Request, res: Response) => {
//   try {
//     const user = res.locals.user as {
//       email: string;
//     };

//     const userEmail = user.email?.trim().toLowerCase();

//     if (!userEmail) {
//       res.status(401).json({
//         success: false,
//         message: "User email not found",
//       });
//       return;
//     }

//     const db = getDB();

//     const borrows = await db
//       .collection("borrows")
//       .find({ userEmail })
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.status(200).json({
//       success: true,
//       message: "Borrow records fetched successfully",
//       data: borrows,
//     });
//   } catch (error) {
//     console.error("Fetch borrows error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch borrow records",
//     });
//   }
// });

// // DELETE /borrows/:id - Return own borrowed book (Protected)
// router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     if (!ObjectId.isValid(id)) {
//       res.status(400).json({
//         success: false,
//         message: "Invalid borrow ID",
//       });
//       return;
//     }

//     const user = res.locals.user as {
//       email: string;
//     };

//     const userEmail = user.email?.trim().toLowerCase();

//     if (!userEmail) {
//       res.status(401).json({
//         success: false,
//         message: "User email not found",
//       });
//       return;
//     }

//     const db = getDB();
//     const borrowsCollection = db.collection("borrows");
//     const booksCollection = db.collection("books");

//     const borrowId = new ObjectId(id);

//     // Delete only the authenticated user's borrow record
//     const deletedBorrow = await borrowsCollection.findOneAndDelete({
//       _id: borrowId,
//       userEmail,
//     });

//     if (!deletedBorrow) {
//       res.status(404).json({
//         success: false,
//         message: "Borrow record not found",
//       });
//       return;
//     }

//     // Restore the available copy
//     const updateResult = await booksCollection.updateOne(
//       {
//         _id: deletedBorrow.bookId,
//         $expr: {
//           $lt: ["$availableCopies", "$totalCopies"],
//         },
//       },
//       {
//         $inc: { availableCopies: 1 },
//       }
//     );

//     if (updateResult.modifiedCount === 0) {
//       // Restore borrow record if book copy could not be updated
//       await borrowsCollection.insertOne(deletedBorrow);

//       res.status(404).json({
//         success: false,
//         message: "Book not found or copy count could not be updated",
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       message: "Book returned successfully",
//     });
//   } catch (error) {
//     console.error("Return error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to return book",
//     });
//   }
// });

// export default router;





import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = Router();

// POST /borrows - Borrow a book (Protected)
router.post("/", verifyToken, async (req: Request, res: Response) => {
  let reservedCopy = false;
  let borrowInserted = false;
  let bookId: ObjectId | null = null;

  try {
    const { bookId: requestedBookId, borrowDate, returnDate } = req.body;

    const user = res.locals.user as {
      id: string;
      email: string;
      name?: string;
    };

    const userEmail = user.email?.trim().toLowerCase();
    const userName = user.name?.trim() || userEmail;

    if (
      typeof requestedBookId !== "string" ||
      !ObjectId.isValid(requestedBookId) ||
      !userEmail ||
      !borrowDate ||
      !returnDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid borrowing information",
      });
    }

    const startDate = new Date(borrowDate);
    const endDate = new Date(returnDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid borrow and return dates",
      });
    }

    const db = getDB();
    const booksCollection = db.collection("books");
    const borrowsCollection = db.collection("borrows");

    bookId = new ObjectId(requestedBookId);

    // Prevent duplicate active borrowing
    await borrowsCollection.createIndex(
      { bookId: 1, userEmail: 1 },
      { unique: true }
    );

    const existingBorrow = await borrowsCollection.findOne({
      bookId,
      userEmail,
    });

    if (existingBorrow) {
      return res.status(409).json({
        success: false,
        message: "You have already borrowed this book",
      });
    }

    const book = await booksCollection.findOne({ _id: bookId });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
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
      return res.status(400).json({
        success: false,
        message: "No copies available for borrowing",
      });
    }

    reservedCopy = true;

    const newBorrow = {
      bookId,
      bookTitle: book.title,
      bookImage: book.image,
      userName,
      userEmail,
      borrowDate: startDate,
      returnDate: endDate,
      createdAt: new Date(),
    };

    const insertResult = await borrowsCollection.insertOne(newBorrow);
    borrowInserted = true;

    return res.status(201).json({
      success: true,
      message: "Book borrowed successfully",
      data: {
        ...newBorrow,
        _id: insertResult.insertedId,
      },
    });
  } catch (error: any) {
    // Restore copy if borrow insertion fails
    if (reservedCopy && !borrowInserted && bookId) {
      try {
        await getDB().collection("books").updateOne(
          { _id: bookId },
          { $inc: { availableCopies: 1 } }
        );
      } catch (rollbackError) {
        console.error("Copy restoration error:", rollbackError);
      }
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already borrowed this book",
      });
    }

    console.error("Borrow error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to borrow book",
    });
  }
});

// GET /borrows - Get only logged-in user's borrow records (Protected)
router.get("/", verifyToken, async (_req: Request, res: Response) => {
  try {
    const user = res.locals.user as {
      email: string;
    };

    const userEmail = user.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: "User email not found",
      });
    }

    const db = getDB();

    const borrows = await db
      .collection("borrows")
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Borrow records fetched successfully",
      data: borrows,
    });
  } catch (error) {
    console.error("Fetch borrows error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch borrow records",
    });
  }
});

// DELETE /borrows/:id - Return own borrowed book (Protected)
router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrow ID",
      });
    }

    const user = res.locals.user as {
      email: string;
    };

    const userEmail = user.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: "User email not found",
      });
    }

    const db = getDB();
    const borrowsCollection = db.collection("borrows");
    const booksCollection = db.collection("books");

    const borrowId = new ObjectId(id);

    // Delete only the authenticated user's borrow record
    const deletedBorrow = await borrowsCollection.findOneAndDelete({
      _id: borrowId,
      userEmail,
    });

    if (!deletedBorrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found",
      });
    }

    // Restore the available copy
    const updateResult = await booksCollection.updateOne(
      {
        _id: deletedBorrow.bookId,
        $expr: {
          $lt: ["$availableCopies", "$totalCopies"],
        },
      },
      {
        $inc: { availableCopies: 1 },
      }
    );

    if (updateResult.modifiedCount === 0) {
      // Restore borrow record if book copy could not be updated
      await borrowsCollection.insertOne(deletedBorrow);

      return res.status(404).json({
        success: false,
        message: "Book not found or copy count could not be updated",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book returned successfully",
    });
  } catch (error) {
    console.error("Return error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to return book",
    });
  }
});

export default router;
