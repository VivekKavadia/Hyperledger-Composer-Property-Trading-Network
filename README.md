//TODO: Commit files related to Yeoman network generation tool.

ASSUMPTIONS:
	Created, intent for sale and registered transactions can be executed only by system admin.
	Other participants have read only access to assets.


TRANSACTIONS:
	Created transaction input accepts all the parameters of the asset Property.

	The following validations are performed:
		.Given property ID should be unique
		.Owner passed in the transaction input should be a valid seller
		.The property should be either public or private, not both
		.Valid market priced should be provided
		


	Intent For Sale transaction performs the following validations:
		.Given property should exist
		.Property Listing ID should be unique
		.Valid seller should be provided

	A dummy function "validateFinancialData" is provided. This function should be used to check a participant's financial details like bank info, documentation etc.
	For the sake of this problem statement no validations are performed and the function returns true by default.

	Only properties marked public can be listed for sale. Property Listings for private properties can be created but these will not be visible to the buyers in the system.



	Registered transaction performs the following validations:
		.Valid property should be provided
		.Valid property listing should be provided
		.Valid buyer should be provided
		.Property and property listing should be listed for sale
		.Buyer should have sufficient balance to buy the property
		
	If all criteria are met then the transaction goes through and bank balance of both buyer, seller are updated. The property listing is then removed.
