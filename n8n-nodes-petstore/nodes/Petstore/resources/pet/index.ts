import type { INodeProperties } from 'n8n-workflow';

export const petDescription: INodeProperties[] = [
		{
			"displayName": "Operation",
			"name": "operation",
			"type": "options",
			"noDataExpression": true,
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					]
				}
			},
			"options": [
				{
					"name": "Update Pet",
					"value": "Update Pet",
					"action": "Update an existing pet.",
					"description": "Update an existing pet by Id.",
					"routing": {
						"request": {
							"method": "PUT",
							"url": "=/pet"
						}
					}
				},
				{
					"name": "Add Pet",
					"value": "Add Pet",
					"action": "Add a new pet to the store.",
					"description": "Add a new pet to the store.",
					"routing": {
						"request": {
							"method": "POST",
							"url": "=/pet"
						}
					}
				},
				{
					"name": "Find Pets By Status",
					"value": "Find Pets By Status",
					"action": "Finds Pets by status.",
					"description": "Multiple status values can be provided with comma separated strings.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/pet/findByStatus"
						}
					}
				},
				{
					"name": "Find Pets By Tags",
					"value": "Find Pets By Tags",
					"action": "Finds Pets by tags.",
					"description": "Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/pet/findByTags"
						}
					}
				},
				{
					"name": "Get Pet By Id",
					"value": "Get Pet By Id",
					"action": "Find pet by ID.",
					"description": "Returns a single pet.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/pet/{{$parameter[\"petId\"]}}"
						}
					}
				},
				{
					"name": "Update Pet With Form",
					"value": "Update Pet With Form",
					"action": "Updates a pet in the store with form data.",
					"description": "Updates a pet resource based on the form data.",
					"routing": {
						"request": {
							"method": "POST",
							"url": "=/pet/{{$parameter[\"petId\"]}}"
						}
					}
				},
				{
					"name": "Delete Pet",
					"value": "Delete Pet",
					"action": "Deletes a pet.",
					"description": "Delete a pet.",
					"routing": {
						"request": {
							"method": "DELETE",
							"url": "=/pet/{{$parameter[\"petId\"]}}"
						}
					}
				},
				{
					"name": "Upload File",
					"value": "Upload File",
					"action": "Uploads an image.",
					"description": "Upload image of the pet.",
					"routing": {
						"request": {
							"method": "POST",
							"url": "=/pet/{{$parameter[\"petId\"]}}/uploadImage"
						}
					}
				}
			],
			"default": ""
		},
		{
			"displayName": "PUT /pet",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet"
					]
				}
			}
		},
		{
			"displayName": "Id",
			"name": "id",
			"type": "number",
			"default": 10,
			"routing": {
				"send": {
					"property": "id",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet"
					]
				}
			}
		},
		{
			"required": true,
			"displayName": "Name",
			"name": "name",
			"type": "string",
			"default": "doggie",
			"routing": {
				"send": {
					"property": "name",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet"
					]
				}
			}
		},
		{
			"displayName": "Category",
			"name": "category",
			"type": "json",
			"default": "{\n  \"id\": 1,\n  \"name\": \"Dogs\"\n}",
			"routing": {
				"send": {
					"property": "category",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ JSON.parse($value) }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet"
					]
				}
			}
		},
		{
			"required": true,
			"displayName": "Photo Urls",
			"name": "photoUrls",
			"type": "json",
			"default": "[\n  null\n]",
			"routing": {
				"send": {
					"property": "photoUrls",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ JSON.parse($value) }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet"
					]
				}
			}
		},
		{
			"displayName": "Tags",
			"name": "tags",
			"type": "json",
			"default": "[\n  {}\n]",
			"routing": {
				"send": {
					"property": "tags",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ JSON.parse($value) }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet"
					]
				}
			}
		},
		{
			"displayName": "Status",
			"name": "status",
			"type": "options",
			"default": "available",
			"description": "pet status in the store",
			"options": [
				{
					"name": "Available",
					"value": "available"
				},
				{
					"name": "Pending",
					"value": "pending"
				},
				{
					"name": "Sold",
					"value": "sold"
				}
			],
			"routing": {
				"send": {
					"property": "status",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet"
					]
				}
			}
		},
		{
			"displayName": "POST /pet",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Add Pet"
					]
				}
			}
		},
		{
			"displayName": "Id",
			"name": "id",
			"type": "number",
			"default": 10,
			"routing": {
				"send": {
					"property": "id",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Add Pet"
					]
				}
			}
		},
		{
			"required": true,
			"displayName": "Name",
			"name": "name",
			"type": "string",
			"default": "doggie",
			"routing": {
				"send": {
					"property": "name",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Add Pet"
					]
				}
			}
		},
		{
			"displayName": "Category",
			"name": "category",
			"type": "json",
			"default": "{\n  \"id\": 1,\n  \"name\": \"Dogs\"\n}",
			"routing": {
				"send": {
					"property": "category",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ JSON.parse($value) }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Add Pet"
					]
				}
			}
		},
		{
			"required": true,
			"displayName": "Photo Urls",
			"name": "photoUrls",
			"type": "json",
			"default": "[\n  null\n]",
			"routing": {
				"send": {
					"property": "photoUrls",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ JSON.parse($value) }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Add Pet"
					]
				}
			}
		},
		{
			"displayName": "Tags",
			"name": "tags",
			"type": "json",
			"default": "[\n  {}\n]",
			"routing": {
				"send": {
					"property": "tags",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ JSON.parse($value) }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Add Pet"
					]
				}
			}
		},
		{
			"displayName": "Status",
			"name": "status",
			"type": "options",
			"default": "available",
			"description": "pet status in the store",
			"options": [
				{
					"name": "Available",
					"value": "available"
				},
				{
					"name": "Pending",
					"value": "pending"
				},
				{
					"name": "Sold",
					"value": "sold"
				}
			],
			"routing": {
				"send": {
					"property": "status",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Add Pet"
					]
				}
			}
		},
		{
			"displayName": "GET /pet/findByStatus",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Find Pets By Status"
					]
				}
			}
		},
		{
			"displayName": "Status",
			"name": "status",
			"required": true,
			"description": "Status values that need to be considered for filter",
			"default": "available",
			"type": "options",
			"options": [
				{
					"name": "Available",
					"value": "available"
				},
				{
					"name": "Pending",
					"value": "pending"
				},
				{
					"name": "Sold",
					"value": "sold"
				}
			],
			"routing": {
				"send": {
					"type": "query",
					"property": "status",
					"value": "={{ $value }}",
					"propertyInDotNotation": false
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Find Pets By Status"
					]
				}
			}
		},
		{
			"displayName": "GET /pet/findByTags",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Find Pets By Tags"
					]
				}
			}
		},
		{
			"displayName": "Tags",
			"name": "tags",
			"required": true,
			"description": "Tags to filter by",
			"default": "[\n  null\n]",
			"type": "json",
			"routing": {
				"send": {
					"type": "query",
					"property": "tags",
					"value": "={{ $value }}",
					"propertyInDotNotation": false
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Find Pets By Tags"
					]
				}
			}
		},
		{
			"displayName": "GET /pet/{petId}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Get Pet By Id"
					]
				}
			}
		},
		{
			"displayName": "Pet Id",
			"name": "petId",
			"required": true,
			"description": "ID of pet to return",
			"default": 0,
			"type": "number",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Get Pet By Id"
					]
				}
			}
		},
		{
			"displayName": "POST /pet/{petId}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet With Form"
					]
				}
			}
		},
		{
			"displayName": "Pet Id",
			"name": "petId",
			"required": true,
			"description": "ID of pet that needs to be updated",
			"default": 0,
			"type": "number",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet With Form"
					]
				}
			}
		},
		{
			"displayName": "Name",
			"name": "name",
			"description": "Name of pet that needs to be updated",
			"default": "",
			"type": "string",
			"routing": {
				"send": {
					"type": "query",
					"property": "name",
					"value": "={{ $value }}",
					"propertyInDotNotation": false
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet With Form"
					]
				}
			}
		},
		{
			"displayName": "Status",
			"name": "status",
			"description": "Status of pet that needs to be updated",
			"default": "",
			"type": "string",
			"routing": {
				"send": {
					"type": "query",
					"property": "status",
					"value": "={{ $value }}",
					"propertyInDotNotation": false
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Update Pet With Form"
					]
				}
			}
		},
		{
			"displayName": "DELETE /pet/{petId}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Delete Pet"
					]
				}
			}
		},
		{
			"displayName": "Api Key",
			"name": "api_key",
			"description": "",
			"default": "",
			"type": "string",
			"routing": {
				"request": {
					"headers": {
						"api_key": "={{ $value }}"
					}
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Delete Pet"
					]
				}
			}
		},
		{
			"displayName": "Pet Id",
			"name": "petId",
			"required": true,
			"description": "Pet id to delete",
			"default": 0,
			"type": "number",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Delete Pet"
					]
				}
			}
		},
		{
			"displayName": "POST /pet/{petId}/uploadImage",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Upload File"
					]
				}
			}
		},
		{
			"displayName": "Pet Id",
			"name": "petId",
			"required": true,
			"description": "ID of pet to update",
			"default": 0,
			"type": "number",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Upload File"
					]
				}
			}
		},
		{
			"displayName": "Additional Metadata",
			"name": "additionalMetadata",
			"description": "Additional Metadata",
			"default": "",
			"type": "string",
			"routing": {
				"send": {
					"type": "query",
					"property": "additionalMetadata",
					"value": "={{ $value }}",
					"propertyInDotNotation": false
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Upload File"
					]
				}
			}
		},
		{
			"displayName": "POST /pet/{petId}/uploadImage<br/><br/>There's no body available for request, kindly use HTTP Request node to send body",
			"name": "operation",
			"type": "notice",
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Pet"
					],
					"operation": [
						"Upload File"
					]
				}
			}
		},
];
