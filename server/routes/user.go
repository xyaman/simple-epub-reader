package routes

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/xyaman/simple-epub-reader/server/models"
)

var db *sql.DB

func Setup(database *sql.DB) {
	db = database
}

func CreateTables() error {
	// User Table
	// TODO: consider remove this
	createUsersTableSQL := `
	CREATE TABLE IF NOT EXISTS users (
				uuid TEXT PRIMARY KEY,
				last_update INTEGER NOT NULL
  );`

	_, err := db.Exec(createUsersTableSQL)
	if err != nil {
		return err
	}

	// Books Table
	createBooksTableSQL := `
	CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_uuid TEXT NOT NULL,
				updated_at INT NOT NULL,
				title TEXT NOT NULL,
				creator TEXT NOT NULL,
				language TEXT NOT NULL,
        last_read_index INTEGER NOT NULL,
        total_index INTEGER NOT NULL,

				FOREIGN KEY(user_uuid) REFERENCES users(uuid)
  );`

	_, err = db.Exec(createBooksTableSQL)
	if err != nil {
		return err
	}

	return nil
}

// GET /user/generate
func GenerateUUID(c *gin.Context) {
	c.Header("Access-Control-Allow-Origin", "*")

	uuid := uuid.New().String()
	now := time.Now().Unix()

	// TODO: change to squirrel
	_, err := db.Exec("INSERT INTO users (uuid, last_update) VALUES (?, ?)", uuid, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Error creating resource.", "error": err.Error()})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    uuid,
	})

}

type SyncRequest struct {
	UserUUID string `json:"user_uuid"`

	// Corresponds to the data that has been updated in the client during this time
	// The server timestamp will always have higher priority
	Data []models.EpubBook `json:"data"`
}

// This function should be called to update books in the backend.
// The backend will check the books timestamps before updating
func UpdateBooks(c *gin.Context) {

	c.Header("Access-Control-Allow-Origin", "*")

	var reqBody SyncRequest
	if err := c.BindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// This map key is the book title and the value is the timestamp
	reqBooksMap := make(map[string]int)
	for _, clientBook := range reqBody.Data {
		reqBooksMap[clientBook.Title] = clientBook.UpdatedAt
	}

	// Get user last timestamp sync
	timestampSQL := sq.Select("id, user_uuid, updated_at, title, creator, language, last_read_index, total_index").
		From("books").
		Where(sq.Eq{"user_uuid": reqBody.UserUUID})

	sqlStr, args, err := timestampSQL.ToSql()
	if err != nil {
		c.String(http.StatusInternalServerError, "Error while generating SQL: ", err)
		return
	}

	rows, err := db.Query(sqlStr, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "error fetching updates",
		})
		return
	}
	defer rows.Close()

	books := make([]models.EpubBook, 0)

	// We get all the books, but now we have to filter and send to the client only the books
	// that are not in the array client send
	for rows.Next() {
		var dbBook models.EpubBook
		if err := rows.Scan(&dbBook.Id, &dbBook.UserUUID, &dbBook.UpdatedAt, &dbBook.Title, &dbBook.Creator, &dbBook.Language, &dbBook.LastReadIndex, &dbBook.TotalIndex); err == nil {
			// only append if book.updateAt is bigger than the body the user sent

			// We only send the book to the client if:
			// 1. the book does not exists in the request (is updated or is it null in the client)
			// 2. the book was sent by the client (to be updated), but it was an older version
			timestampClientBook, exists := reqBooksMap[dbBook.Title]
			if (exists && timestampClientBook < dbBook.UpdatedAt) || !exists {
				books = append(books, dbBook)
				fmt.Println("book will be returned", timestampClientBook, dbBook.Title)
			}
		}
	}

	// We update the book in the server
	booksUpdates := make([]string, 0)
	for _, clientBook := range reqBody.Data {
		// We get the book from the db and compare. Should we update?
		sqlQuery, args, err := sq.Select("updated_at").
			From("books").
			Where(sq.And{
				sq.Eq{"title": clientBook.Title},
				sq.Eq{"user_uuid": reqBody.UserUUID},
			}).
			Limit(1).
			ToSql()

		if err != nil {
			c.String(http.StatusInternalServerError, "Error while generating SQL: ", err)
			return
		}

		var updatedAt int = -1
		err = db.QueryRow(sqlQuery, args...).Scan(&updatedAt)
		if err != nil {
			if err == sql.ErrNoRows {
				log.Printf("No book was found with the title: %s and uuid: %s\n", clientBook.Title, reqBody.UserUUID)
			} else {
				c.String(http.StatusInternalServerError, "Error executing SQL: ", err)
				return
			}
		}

		// If no book was found, we insert the book
		// Otherwise, we update
		if updatedAt == -1 {
			insertSQL := sq.Insert("books").
				Columns("user_uuid", "updated_at", "title", "creator", "language", "last_read_index", "total_index").
				Values(reqBody.UserUUID, clientBook.UpdatedAt, clientBook.Title, clientBook.Creator, clientBook.Language, clientBook.LastReadIndex, clientBook.TotalIndex)

			sql, args, err := insertSQL.ToSql()
			if err != nil {
				c.String(http.StatusInternalServerError, "Error while generating SQL: ", err)
				return
			}

			_, err = db.Exec(sql, args...)
			if err != nil {
				c.String(http.StatusInternalServerError, "Error while inserting Book: ", err)
				return
			}

			fmt.Printf("Book %s will be created in the db\n", clientBook.Title)

			booksUpdates = append(booksUpdates, clientBook.Title)

			continue
		}

		if clientBook.UpdatedAt > updatedAt {
			fmt.Printf("Book %s will be updated in the db\n", clientBook.Title)

			updateSQL := sq.Update("books").
				Set("updated_at", clientBook.UpdatedAt).
				Set("last_read_index", clientBook.LastReadIndex).
				Set("total_index", clientBook.TotalIndex).
				Where(sq.And{
					sq.Eq{"title": clientBook.Title},
					sq.Eq{"user_uuid": reqBody.UserUUID},
				})

			sqlQuery, args, err := updateSQL.ToSql()
			if err != nil {
				c.String(http.StatusInternalServerError, "Error while generating SQL: ", err)
				return
			}

			result, err := db.Exec(sqlQuery, args...)
			if err != nil {
				c.String(http.StatusInternalServerError, "Error while executing SQL: ", err)
				return
			}

			rowsAffected, err := result.RowsAffected()
			if err != nil {
				c.String(http.StatusInternalServerError, "Error getting affected rows", err)
				return
			}

			fmt.Printf("Success. Affected row: %d\n", rowsAffected)
			booksUpdates = append(booksUpdates, clientBook.Title)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"updated_books":  books,
		"server_updates": booksUpdates,
	})
}
