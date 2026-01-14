package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"bmlquery-backend/db"

	"gopkg.in/yaml.v3"
)

type Filter struct {
	Attribute      string `json:"attribute"`
	Condition      string `json:"condition"`
	ConditionValue string `json:"condition_value"`
}

type QueryInput struct {
	Function string   `json:"function"`
	Model    string   `json:"model"`
	Filters  []Filter `json:"filters"`
}

func loadSchemaHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the schema file
	// Assuming the file is at "../example/DBSchemaFile.cdm" relative to backend run
	data, err := os.ReadFile("../example/DBSchemaFile.cdm")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read schema file: %v", err), http.StatusInternalServerError)
		return
	}

	// Parse YAML
	var schema map[string]map[string]string
	if err := yaml.Unmarshal(data, &schema); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse schema: %v", err), http.StatusInternalServerError)
		return
	}

	// Process and store
	count := 0
	for modelID, attributes := range schema {
		var modelName string
		// First pass to find model name from attributes
		for _, attrValue := range attributes {
			if attrValue == "$ncm" {
				continue
			}
			parts := strings.Split(attrValue, ".")
			if len(parts) >= 2 {
				// Atomiton.DBA.ShapeFile.enterpriseId -> ShapeFile is at index len-2
				modelName = parts[len(parts)-2]
				break
			}
		}

		if modelName == "" {
			continue // Could not determine model name
		}

		if err := db.InsertModel(modelID, modelName); err != nil {
			log.Printf("Error inserting model %s: %v", modelName, err)
			continue
		}

		for attrID, attrValue := range attributes {
			if attrValue == "$ncm" {
				continue
			}
			parts := strings.Split(attrValue, ".")
			if len(parts) >= 1 {
				attrName := parts[len(parts)-1]
				if err := db.InsertAttribute(attrID, modelID, attrName, attrValue); err != nil {
					log.Printf("Error inserting attribute %s: %v", attrName, err)
				}
				count++
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Successfully loaded schema. Processed %d attributes.", count)
}

func generateHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var input QueryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Dynamic map to hold the query structure
	// Structure: Function -> Model -> Attribute -> Condition: Value
	queryMap := make(map[string]interface{})
	modelMap := make(map[string]interface{})

	for _, filter := range input.Filters {
		attrMap := make(map[string]interface{})
		attrMap[filter.Condition] = filter.ConditionValue
		modelMap[filter.Attribute] = attrMap
	}

	queryMap[input.Function] = map[string]interface{}{
		input.Model: modelMap,
	}

	w.Header().Set("Content-Type", "application/x-yaml")

	// Add the top line "#"
	if _, err := w.Write([]byte("#\n")); err != nil {
		http.Error(w, "Failed to write header", http.StatusInternalServerError)
		return
	}

	encoder := yaml.NewEncoder(w)
	encoder.SetIndent(1)
	if err := encoder.Encode(queryMap); err != nil {
		http.Error(w, "Failed to generate YAML", http.StatusInternalServerError)
		return
	}
}

func getModelsHandler(w http.ResponseWriter, r *http.Request) {
	// Enable CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	models, err := db.GetAllModelsWithAttributes()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve models: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func main() {
	// Initialize DB
	db.InitDB("bmlquery.db")

	http.HandleFunc("/generate", generateHandler)
	http.HandleFunc("/load-schema", loadSchemaHandler)
	http.HandleFunc("/models", getModelsHandler)
	fmt.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
