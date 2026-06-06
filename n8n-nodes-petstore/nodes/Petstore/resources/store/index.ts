import type { INodeProperties } from 'n8n-workflow';

export const storeDescription: INodeProperties[] = [
		{
			"displayName": "Operation",
			"name": "operation",
			"type": "options",
			"noDataExpression": true,
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					]
				}
			},
			"options": [
				{
					"name": "Get Inventory",
					"value": "Get Inventory",
					"action": "Returns pet inventories by status.",
					"description": "Returns a map of status codes to quantities.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/store/inventory"
						}
					}
				},
				{
					"name": "Place Order",
					"value": "Place Order",
					"action": "Place an order for a pet.",
					"description": "Place a new order in the store.",
					"routing": {
						"request": {
							"method": "POST",
							"url": "=/store/order"
						}
					}
				},
				{
					"name": "Get Order By Id",
					"value": "Get Order By Id",
					"action": "Find purchase order by ID.",
					"description": "For valid response try integer IDs with value <= 5 or > 10. Other values will generate exceptions.",
					"routing": {
						"request": {
							"method": "GET",
							"url": "=/store/order/{{$parameter[\"orderId\"]}}"
						}
					}
				},
				{
					"name": "Delete Order",
					"value": "Delete Order",
					"action": "Delete purchase order by identifier.",
					"description": "For valid response try integer IDs with value < 1000. Anything above 1000 or non-integers will generate API errors.",
					"routing": {
						"request": {
							"method": "DELETE",
							"url": "=/store/order/{{$parameter[\"orderId\"]}}"
						}
					}
				}
			],
			"default": ""
		},
		{
			"displayName": "GET /store/inventory",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Get Inventory"
					]
				}
			}
		},
		{
			"displayName": "POST /store/order",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Place Order"
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
						"Store"
					],
					"operation": [
						"Place Order"
					]
				}
			}
		},
		{
			"displayName": "Pet Id",
			"name": "petId",
			"type": "number",
			"default": 198772,
			"routing": {
				"send": {
					"property": "petId",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Place Order"
					]
				}
			}
		},
		{
			"displayName": "Quantity",
			"name": "quantity",
			"type": "number",
			"default": 7,
			"routing": {
				"send": {
					"property": "quantity",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Place Order"
					]
				}
			}
		},
		{
			"displayName": "Ship Date",
			"name": "shipDate",
			"type": "string",
			"default": "",
			"routing": {
				"send": {
					"property": "shipDate",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Place Order"
					]
				}
			}
		},
		{
			"displayName": "Status",
			"name": "status",
			"type": "options",
			"default": "approved",
			"description": "Order Status",
			"options": [
				{
					"name": "Placed",
					"value": "placed"
				},
				{
					"name": "Approved",
					"value": "approved"
				},
				{
					"name": "Delivered",
					"value": "delivered"
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
						"Store"
					],
					"operation": [
						"Place Order"
					]
				}
			}
		},
		{
			"displayName": "Complete",
			"name": "complete",
			"type": "boolean",
			"default": true,
			"routing": {
				"send": {
					"property": "complete",
					"propertyInDotNotation": false,
					"type": "body",
					"value": "={{ $value }}"
				}
			},
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Place Order"
					]
				}
			}
		},
		{
			"displayName": "GET /store/order/{orderId}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Get Order By Id"
					]
				}
			}
		},
		{
			"displayName": "Order Id",
			"name": "orderId",
			"required": true,
			"description": "ID of order that needs to be fetched",
			"default": 0,
			"type": "number",
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Get Order By Id"
					]
				}
			}
		},
		{
			"displayName": "DELETE /store/order/{orderId}",
			"name": "operation",
			"type": "notice",
			"typeOptions": {
				"theme": "info"
			},
			"default": "",
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Delete Order"
					]
				}
			}
		},
		{
			"displayName": "Order Id",
			"name": "orderId",
			"required": true,
			"description": "ID of the order that needs to be deleted",
			"default": 0,
			"type": "number",
			"displayOptions": {
				"show": {
					"resource": [
						"Store"
					],
					"operation": [
						"Delete Order"
					]
				}
			}
		},
];
