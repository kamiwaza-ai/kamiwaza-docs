---
sidebar_position: 1
---

# VectorDB Service

## Overview
The VectorDB documentation covers the Kamiwaza SDK vector storage and retrieval workflows used by RAG applications. In the 0.12.0 SDK snapshot, vector operations are collection-oriented: you insert vectors and metadata into a named collection, then query that collection for similar content.

## Key Features
- Vector Database Management
- Collection-based Vector Storage and Retrieval
- Similarity Search
- Metadata-aware Vector Operations
- Database Lifecycle Management

## Vector Database Management

### Available Methods
- `create_vectordb(...) -> VectorDB`: Create a vector database backend
- `get_vectordbs() -> List[VectorDB]`: List registered vector databases
- `get_vectordb(vectordb_id: UUID) -> VectorDB`: Get database details
- `remove_vectordb(vectordb_id: UUID)`: Remove a vector database

```python
from kamiwaza_sdk import KamiwazaClient
from kamiwaza_sdk.schemas.vectordb import CreateVectorDB

client = KamiwazaClient("https://your-kamiwaza.example/api")

# Create vector database
vectordb = client.vectordb.create_vectordb(CreateVectorDB(
    name="my-vectors",
    dimension=768,
    metric="cosine"
))

# List databases
databases = client.vectordb.get_vectordbs()

# Get specific database
db = client.vectordb.get_vectordb(vectordb_id)

# Remove database
client.vectordb.remove_vectordb(vectordb_id)
```

## Vector Operations

### Available Methods
- `insert(vectors, metadata, collection_name, field_list=None) -> InsertResponse`: Insert vectors into a collection
- `search(query_vector, collection_name, limit=10, output_fields=None) -> List[SearchResult]`: Search a collection by vector similarity
- `list_collections() -> List[str]`: List available collections
- `drop_collection(collection_name) -> None`: Remove a collection

```python
vectors = [
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
]
metadata = [
    {"source": "doc1.md", "offset": 0, "filename": "doc1.md"},
    {"source": "doc2.md", "offset": 512, "filename": "doc2.md"},
]

# Insert vectors into a collection
response = client.vectordb.insert(
    vectors=vectors,
    metadata=metadata,
    collection_name="documents",
    field_list=[("filename", "str")]
)

# Search a collection by query vector
results = client.vectordb.search(
    query_vector=[0.1, 0.2, 0.3],
    collection_name="documents",
    limit=5,
    output_fields=["source", "offset", "filename"]
)
```

## Error Handling
The service includes built-in error handling for common scenarios:
```python
try:
    vectordb = client.vectordb.create_vectordb(config)
except DimensionError as e:
    print(f"Invalid dimension: {e}")
except MetricError as e:
    print(f"Invalid metric: {e}")
except APIError as e:
    print(f"Operation failed: {e}")
```

## Best Practices
1. Choose appropriate vector dimensions based on your embedding model
2. Select the right similarity metric for your use case
3. Use batch operations for better performance
4. Include relevant metadata with vectors so retrieval results can be cited clearly
5. Reuse stable collection names for each corpus or application
6. Clean up unused collections and databases
7. Monitor database size and performance
8. Implement proper error handling for vector operations
