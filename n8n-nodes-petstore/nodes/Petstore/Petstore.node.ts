import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { petDescription } from './resources/pet';
import { storeDescription } from './resources/store';
import { userDescription } from './resources/user';

export class Petstore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'petstore',
		name: 'N8nDevPetstore',
		icon: { light: 'file:./petstore.svg', dark: 'file:./petstore.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{\$parameter["operation"] + ": " + \$parameter["resource"]}}',
		description: 'n8n community node for petstore API',
		defaults: { name: 'petstore' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'N8nDevPetstoreApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{\$credentials.url}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
		{
			"displayName": "Resource",
			"name": "resource",
			"type": "options",
			"noDataExpression": true,
			"options": [
				{
					"name": "Pet",
					"value": "Pet",
					"description": "Everything about your Pets"
				},
				{
					"name": "Store",
					"value": "Store",
					"description": "Access to Petstore orders"
				},
				{
					"name": "User",
					"value": "User",
					"description": "Operations about user"
				}
			],
			"default": ""
		},
		...petDescription,
		...storeDescription,
		...userDescription
		],
	};
}
