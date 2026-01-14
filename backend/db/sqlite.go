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

	createQueriesTable := `
	CREATE TABLE IF NOT EXISTS saved_queries (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		query_string TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(createModelsTable); err != nil {
		log.Fatal(err)
	}
	if _, err := DB.Exec(createAttributesTable); err != nil {
		log.Fatal(err)
	}
	if _, err := DB.Exec(createQueriesTable); err != nil {
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

// SavedQuery represents a stored query
type SavedQuery struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	QueryString string `json:"query_string"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type SavedQueryListItem struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// GetAllQueries returns list of all saved queries (id and name only)
func GetAllQueries() ([]SavedQueryListItem, error) {
	rows, err := DB.Query("SELECT id, name FROM saved_queries ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	queries := make([]SavedQueryListItem, 0) // Initialize as empty slice instead of nil
	for rows.Next() {
		var q SavedQueryListItem
		if err := rows.Scan(&q.ID, &q.Name); err != nil {
			return nil, err
		}
		queries = append(queries, q)
	}
	return queries, nil
}

// GetQueryByID returns a specific saved query
func GetQueryByID(id int) (*SavedQuery, error) {
	var q SavedQuery
	err := DB.QueryRow("SELECT id, name, query_string, created_at, updated_at FROM saved_queries WHERE id = ?", id).
		Scan(&q.ID, &q.Name, &q.QueryString, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &q, nil
}

// CreateQuery creates a new saved query
func CreateQuery(name, queryString string) (int64, error) {
	result, err := DB.Exec("INSERT INTO saved_queries (name, query_string) VALUES (?, ?)", name, queryString)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// UpdateQuery updates an existing query
func UpdateQuery(id int, name, queryString string) error {
	_, err := DB.Exec("UPDATE saved_queries SET name = ?, query_string = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		name, queryString, id)
	return err
}

// DeleteQuery deletes a saved query
func DeleteQuery(id int) error {
	_, err := DB.Exec("DELETE FROM saved_queries WHERE id = ?", id)
	return err
}
