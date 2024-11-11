package main

import (
	"database/sql"
	"log"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	"github.com/xyaman/simple-epub-reader/server/routes"
)

func main() {
	sqldb, err := sql.Open("sqlite3", "./main.db")
	if err != nil {
		log.Fatal("Can't open the database: ", err)
	}

	routes.Setup(sqldb)
	if err := routes.CreateTables(); err != nil {
		log.Fatal("Error while creating the tables: ", err)
	}

	r := gin.Default()

	r.GET("/user/generate", routes.GenerateUUID) // Generate a new user uuid
	r.POST("/user/sync", routes.UpdateBooks)     // Get all user books based on an uuid

	r.Run("localhost:3000") // listen and serve on 0.0.0.0:8080
}
