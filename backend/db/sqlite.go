package db

import (
	"database/sql"
	"log"
	"sort"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB(filepath string) {
	var err error
	DB, err = sql.Open("sqlite3", filepath)
	if err != nil {
		log.Fatal(err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal(err)
	}

	createTables()
}

func createTables() {
	createModelsTable := `
	CREATE TABLE IF NOT EXISTS models (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL
	);`

	createAttributesTable := `
	CREATE TABLE IF NOT EXISTS attributes (
		id TEXT PRIMARY KEY,
		model_id TEXT,
		name TEXT NOT NULL,
		original_key TEXT,
		FOREIGN KEY(model_id) REFERENCES models(id)
	);`

	if _, err := DB.Exec(createModelsTable); err != nil {
		log.Fatal(err)
	}
	if _, err := DB.Exec(createAttributesTable); err != nil {
		log.Fatal(err)
	}
}

func InsertModel(id, name string) error {
	stmt, err := DB.Prepare("INSERT OR REPLACE INTO models(id, name) VALUES(?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()
	_, err = stmt.Exec(id, name)
	return err
}

func InsertAttribute(id, modelID, name, originalKey string) error {
	stmt, err := DB.Prepare("INSERT OR REPLACE INTO attributes(id, model_id, name, original_key) VALUES(?, ?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()
	_, err = stmt.Exec(id, modelID, name, originalKey)
	return err
}

type ModelWithAttributes struct {
	Name       string   `json:"name"`
	Attributes []string `json:"attributes"`
}

func GetAllModelsWithAttributes() ([]ModelWithAttributes, error) {
	rows, err := DB.Query("SELECT m.name, a.name FROM models m JOIN attributes a ON m.id = a.model_id ORDER BY m.name, a.name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	modelMap := make(map[string][]string)
	for rows.Next() {
		var modelName, attrName string
		if err := rows.Scan(&modelName, &attrName); err != nil {
			return nil, err
		}
		modelMap[modelName] = append(modelMap[modelName], attrName)
	}

	// Map iteration is random, so we need to sort the result
	var result []ModelWithAttributes
	for name, attrs := range modelMap {
		result = append(result, ModelWithAttributes{
			Name:       name,
			Attributes: attrs,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})

	return result, nil
}
