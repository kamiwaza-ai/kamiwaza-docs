# API Reference

## # Documentation Todo List

## Authentication Service

### `login_for_access_token`

Login to get access token

### `verify_token`

Verify authentication token

### `create_local_user`

Create new local user

### `list_users`

List all users

### `read_users_me`

Get current user info

### `login_local`

Local login

### `read_user`

Get specific user info

### `update_user`

Update user details

### `delete_user`

Delete user

### `read_own_permissions`

Get own permissions

### `create_organization`

Create new organization

### `read_organization`

Get organization info

### `update_organization`

Update organization

### `delete_organization`

Delete organization

### `create_group`

Create new group

### `read_group`

Get group info

### `update_group`

Update group

### `delete_group`

Delete group

### `create_role`

Create new role

### `read_role`

Get role info

### `update_role`

Update role

### `delete_role`

Delete role

### `create_right`

Create new right

### `read_right`

Get right info

### `update_right`

Update right

### `delete_right`

Delete right

### `add_user_to_group`

Add user to group

### `remove_user_from_group`

Remove user from group

### `assign_role_to_group`

Assign role to group

### `remove_role_from_group`

Remove role from group

### `assign_right_to_role`

Assign right to role

### `remove_right_from_role`

Remove right from role

## Model Service

### `get_model`

Get model by ID

### `create_model`

Create new model

### `delete_model`

Delete model

### `list_models`

List all models

### `search_models`

Search for models

### `initiate_model_download`

Start model download

### `check_download_status`

Check model download status

### `get_model_files_download_status`

Get file download status

### `get_model_by_repo_id`

Get model by repo ID

### `get_model_memory_usage`

Get model memory usage

### `delete_model_file`

Delete model file

### `get_model_file`

Get model file

### `get_model_files_by_model_id`

Get files by model ID

### `list_model_files`

List all model files

### `create_model_file`

Create model file

### `search_hub_model_files`

Search hub model files

### `get_model_file_memory_usage`

Get file memory usage

### `create_model_config`

Create model config

### `get_model_configs`

Get model configs

### `get_model_configs_for_model`

Get configs for model

## Serving Service

### `start_ray`

Start Ray service

### `get_status`

Get Ray status

### `estimate_model_vram`

Estimate model VRAM

### `deploy_model`

Deploy a model

### `list_deployments`

List model deployments

### `get_deployment`

Get deployment info

### `stop_deployment`

Stop deployment

### `get_deployment_status`

Get deployment status

### `list_model_instances`

List model instances

### `get_model_instance`

Get instance info

### `get_health`

Get deployment health

### `unload_model`

Unload model

### `load_model`

Load model

### `simple_generate`

Simple text generation

### `generate`

Advanced text generation

## VectorDB Service

### `create_vectordb`

Create vector database

### `get_vectordbs`

List vector databases

### `get_vectordb`

Get vector database

### `remove_vectordb`

Remove vector database

### `insert_vectors`

Insert vectors

### `search_vectors`

Search vectors

### `insert`

Simplified vector insertion

### `search`

Simplified vector search

## Embedding Service

### `chunk_text`

Chunk text into pieces

### `embed_chunks`

Generate embeddings

### `create_embedding`

Create embedding

### `get_embedding`

Get embedding

### `reset_model`

Reset embedding model

### `call`

Generate batch embeddings

### `initialize_provider`

Initialize embedding provider

### `HuggingFaceEmbedding`

Create HuggingFace embedder

### `get_providers`

List available providers

## Retrieval Service

### `retrieve_relevant_chunks`

Get relevant text chunks

## Ingestion Service

### `ingest`

Ingest data

### `ingest_dataset`

Ingest dataset to catalog

### `initialize_embedder`

Initialize embedder

### `process_documents`

Process documents

## Cluster Service

### `create_location`

Create new location

### `update_location`

Update location

### `get_location`

Get location info

### `list_locations`

List locations

### `create_cluster`

Create new cluster

### `get_cluster`

Get cluster info

### `list_clusters`

List clusters

### `get_node_by_id`

Get node info

### `get_running_nodes`

List running nodes

### `list_nodes`

List all nodes

### `create_hardware`

Create hardware entry

### `get_hardware`

Get hardware info

### `list_hardware`

List hardware entries

### `get_runtime_config`

Get runtime config

### `get_hostname`

Get cluster hostname

## Lab Service

### `list_labs`

List all labs

### `create_lab`

Create new lab

### `get_lab`

Get lab info

### `delete_lab`

Delete lab

## Activity Service

### `get_recent_activity`

Get recent activities

## Catalog Service

### `list_datasets`

List all datasets

### `create_dataset`

Create new dataset

### `list_containers`

List containers

### `get_dataset`

Get dataset info

### `ingest_by_path`

Ingest dataset by path

### `secret_exists`

Check secret existence

### `create_secret`

Create new secret

### `flush_catalog`

Clear catalog data

