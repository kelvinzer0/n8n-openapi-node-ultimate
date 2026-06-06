import type { INodeProperties } from 'n8n-workflow';

export const userDescription: INodeProperties[] = [
		{
			"displayName": "Operation",
			"name": "operation",
			"type": "options",
			"noDataExpression": true,
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					]
				}
			},
			"options": [
				{
					"name": "Create User",
					"value": "Create User",
					"action": "Create user.",
					"description": "This can only be done by the logged in user.",
					"routing": {
						"request": {
							"method": "POST",
							"url": "=/user"
						}
					}
				},
				{
					"name": "Create Users With List Input",
					"value": "Create Users With List Input",
					"action": "Creates list of users with given input array.",
					"description": "Creates list of users with given input array.",
					"routing": {
						"request": {
							"method": "POST",
							"url": "=/user/createWithList"
						}
					}
				},
				{
					"name": "Login User",
					"value": "Login User",
					"action": "Logs user into the system.",
					"description": "Log into the system.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/user/login"
						}
					}
				},
				{
					"name": "Logout User",
					"value": "Logout User",
					"action": "Logs out current logged in user session.",
					"description": "Log user out of the system.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/user/logout"
						}
					}
				},
				{
					"name": "Get User By Name",
					"value": "Get User By Name",
					"action": "Get user by user name.",
					"description": "Get user detail based on username.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/user/{{$parameter[\"username\"]}}"
						}
					}
				},
				{
					"name": "Update User",
					"value": "Update User",
					"action": "Update user resource.",
					"description": "This can only be done by the logged in user.",
					"routing": {
						"request": {
							"method": "PUT",
							"url": "=/user/{{$parameter[\"username\"]}}"
						}
					}
				},
				{
					"name": "Delete User",
					"value": "Delete User",
					"action": "Delete user resource.",
					"description": "This can only be done by the logged in user.",
					"routing": {
						"request": {
							"method": "DELETE",
							"url": "=/user/{{$parameter[\"username\"]}}"
						}
					}
				}
			],
			"default": ""
		},
		{
			"displayName": "POST /user",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
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
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "Username",
			"name": "username",
			"type": "string",
			"default": "theUser",
			"routing": {
				"send": {
					"property": "username",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "First Name",
			"name": "firstName",
			"type": "string",
			"default": "John",
			"routing": {
				"send": {
					"property": "firstName",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "Last Name",
			"name": "lastName",
			"type": "string",
			"default": "James",
			"routing": {
				"send": {
					"property": "lastName",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "Email",
			"name": "email",
			"type": "string",
			"default": "john@email.com",
			"routing": {
				"send": {
					"property": "email",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "Password",
			"name": "password",
			"type": "string",
			"default": "12345",
			"routing": {
				"send": {
					"property": "password",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "Phone",
			"name": "phone",
			"type": "string",
			"default": "12345",
			"routing": {
				"send": {
					"property": "phone",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "User Status",
			"name": "userStatus",
			"type": "number",
			"default": 1,
			"description": "User Status",
			"routing": {
				"send": {
					"property": "userStatus",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create User"
					]
				}
			}
		},
		{
			"displayName": "POST /user/createWithList",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create Users With List Input"
					]
				}
			}
		},
		{
			"displayName": "Body",
			"name": "body",
			"type": "json",
			"default": "{\n  \"id\": 10,\n  \"username\": \"theUser\",\n  \"firstName\": \"John\",\n  \"lastName\": \"James\",\n  \"email\": \"john@email.com\",\n  \"password\": \"12345\",\n  \"phone\": \"12345\",\n  \"userStatus\": 1\n}",
			"routing": {
				"request": {
					"body": "={{ JSON.parse($value) }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Create Users With List Input"
					]
				}
			}
		},
		{
			"displayName": "GET /user/login",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Login User"
					]
				}
			}
		},
		{
			"displayName": "Username",
			"name": "username",
			"description": "The user name for login",
			"default": "",
			"type": "string",
			"routing": {
				"send": {
					"type": "query",
					"property": "username",
					"value": "={{ $value }}",
					"propertyInDotNotation": false
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Login User"
					]
				}
			}
		},
		{
			"displayName": "Password",
			"name": "password",
			"description": "The password for login in clear text",
			"default": "",
			"type": "string",
			"routing": {
				"send": {
					"type": "query",
					"property": "password",
					"value": "={{ $value }}",
					"propertyInDotNotation": false
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Login User"
					]
				}
			}
		},
		{
			"displayName": "GET /user/logout",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Logout User"
					]
				}
			}
		},
		{
			"displayName": "GET /user/{username}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Get User By Name"
					]
				}
			}
		},
		{
			"displayName": "Username",
			"name": "username",
			"required": true,
			"description": "The name that needs to be fetched. Use user1 for testing",
			"default": "",
			"type": "string",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Get User By Name"
					]
				}
			}
		},
		{
			"displayName": "PUT /user/{username}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "Username",
			"name": "username",
			"required": true,
			"description": "name that need to be deleted",
			"default": "",
			"type": "string",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
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
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "Username",
			"name": "username",
			"type": "string",
			"default": "theUser",
			"routing": {
				"send": {
					"property": "username",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "First Name",
			"name": "firstName",
			"type": "string",
			"default": "John",
			"routing": {
				"send": {
					"property": "firstName",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "Last Name",
			"name": "lastName",
			"type": "string",
			"default": "James",
			"routing": {
				"send": {
					"property": "lastName",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "Email",
			"name": "email",
			"type": "string",
			"default": "john@email.com",
			"routing": {
				"send": {
					"property": "email",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "Password",
			"name": "password",
			"type": "string",
			"default": "12345",
			"routing": {
				"send": {
					"property": "password",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "Phone",
			"name": "phone",
			"type": "string",
			"default": "12345",
			"routing": {
				"send": {
					"property": "phone",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "User Status",
			"name": "userStatus",
			"type": "number",
			"default": 1,
			"description": "User Status",
			"routing": {
				"send": {
					"property": "userStatus",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Update User"
					]
				}
			}
		},
		{
			"displayName": "DELETE /user/{username}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Delete User"
					]
				}
			}
		},
		{
			"displayName": "Username",
			"name": "username",
			"required": true,
			"description": "The name that needs to be deleted",
			"default": "",
			"type": "string",
			"displayOptions": {
				"show": {
					"resource": [
						"User"
					],
					"operation": [
						"Delete User"
					]
				}
			}
		},
];
