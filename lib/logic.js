//Global variable nameSpace to identify the name space of the network
const nameSpace = 'org.makaan.property';

/**
* Transaction to add a new property
* @param {org.makaan.property.Created} tx
* @transaction
*/
async function created(tx) {
     console.log('Created transaction');
     
     try {
          //Verify that property ID is unique before proceeding
          let propertyExists = await query('selectPropertyFromPropertyID', { propertyID: tx.propertyID })
          if (propertyExists.length > 0) {
               throw (`Property ID ${tx.propertyID} already exists`);
          }
          
          //Verify that owner passed in the transaction is a valid seller
          const sellerRegistry = await getParticipantRegistry(`${nameSpace}.Seller`);
          const doesSellerExist = await sellerRegistry.exists(tx.owner);
          if (!doesSellerExist) {
               throw (`Owner ${tx.owner} is not a registered seller`);
          }

          //Verify that property is either public or private. not both
          if (tx.public ^ tx.private) {
               throw (`Property should be either public or private, not both`);
          }

          //Valid market price should be provided
          if (tx.marketPrice < 1) {
               throw (`${tx.marketPrice} is not a valid market price`);
          }

          //Value of boolean intentForSale and status should make sense
          //If intentForSale flag is false then status should not be
          //"IntentForSale"
          if (tx.intentForSale && tx.status != "IntentForSale") {
               throw (`Status of property is incorrect`);
          }

          //All checks passed so create new asset
          const factory = getFactory();
          //Create the new property
          const property = factory.newResource(nameSpace, 'Property', tx.propertyID);
          //Set property data
          property.propertyID = tx.propertyID;
          property.owner = tx.owner;
          property.registrationDate = tx.registrationDate;
          property.propertyType = tx.propertyType;
          property.location = tx.location;
          property.public = tx.public;
          property.private = tx.private;
          property.marketPrice = tx.marketPrice;
          property.intentForSale = tx.intentForSale;

          //Get the asset registry
          const registry = await getAssetRegistry(property.getFullyQualifiedType());
          //Add the new property
          await registry.add(property);
          console.log(`Property created with ID ${property.propertyID}`);
          return `Property created with ID ${property.propertyID}`;

     } catch (e) {
          console.log(e);
          return (e);
     }
}

/**
* Transaction to create property listing of properties available for sale
* @param {org.makaan.property.IntentForSale} tx
* @transaction
*/
async function intentForSale(tx) {
     console.log('Intent for sale transaction');

     try {
          //Get the asset registry
          const propertyRegistry = await getAssetRegistry(`${nameSpace}.Property`);
          const propertyListingRegistry = await getAssetRegistry(`${nameSpace}.PropertyListing`);
          const sellerRegistry = await getParticipantRegistry(`${nameSpace}.Seller`);

          //Verify that given property ID exists
          const doesPropertyExist = await propertyRegistry.exists(tx.property.propertyID);
          if (!doesPropertyExist) {
               throw (`Property ${tx.property.propertyID} does not exist`);
          }

          //Verify that property listing does not exist
          const doesPropertyListingExist = await propertyListingRegistry.exists(tx.propertyListing.PLID);
          if (doesPropertyListingExist) {
               throw (`Property Listing ${tx.propertyListing.PLID} already exists`);
          }

          //Verify that seller exists
          const doesSellerExist = await sellerRegistry.exists(tx.seller.sellerName);
          if (!doesSellerExist) {
               throw (`Seller ${tx.seller.sellerName} does not exist`);
          }

          //Verify that owner of property is the same as seller received in the transaction
          const property = await propertyRegistry.get(tx.property.propertyID);
          if (property.owner != tx.seller.sellerName) {
               throw (`Only owner of the property can update intent for sale`);
          }

          //Verify that property has not been previously listed for sale
          if (property.intentForSale) {
               throw (`Property ${tx.property.propertyID} is already listed for sale`);
          }

          //Dummy function to validate seller's financial data
          if (!validateFinancialData(tx.seller)) {
               throw (`Seller financial details are invalid`);
          }

          //Getting the factory 	
          const factory = getFactory();
          //Create new property listing
          const propertyListing = factory.newResource(nameSpace, 'PropertyListing', tx.propertyListing.PLID);
          propertyListing.PLID = tx.propertyListing.PLID;
          propertyListing.owner = tx.property.owner;
          propertyListing.registrationDate = tx.property.registrationDate;
          propertyListing.propertyType = tx.property.propertyType;
          propertyListing.location = tx.property.location;
          propertyListing.marketPrice = tx.property.marketPrice;
          if (tx.property.public) {
               //Property is public so status set to IntentForSale
               propertyListing.status = "IntentForSale";
               property.status = "IntentForSale";
               property.intentForSale = true;
          } else {
               //Property is private so status set to Created
               //This is to prevent Buyers from seeing private property listings
               propertyListing.status = "Created";
          }

          //Get the asset registry
          let registry = await getAssetRegistry(propertyListing.getFullyQualifiedType());
          //Add the property listing
          await registry.add(propertyListing);

          //Get the asset registry
          registry = await getAssetRegistry(property.getFullyQualifiedType());
          //Update the property
          await registry.update(property);

          console.log(`Property Listing created with ID - ${propertyListing.PLID}`);
          return `Property Listing created with ID - ${propertyListing.PLID}`;

     } catch (e) {
          console.log(e);
          return e;
     }
}

//Implement validations on participant info like ID number, bank account, etc
//In real life stringent validations would be in place
//For the sake of the assignment this function returns true
function validateFinancialData(participant) {
     return true
}

/**
* Transaction to transfer ownership of property after successful sale
* @param {org.makaan.property.Registered} tx
* @transaction
*/
async function registered(tx) {
     console.log('Registered transaction');

     try {
          //Get the asset registry
          const buyerRegistry = await getParticipantRegistry(`${nameSpace}.Buyer`);
          const sellerRegistry = await getParticipantRegistry(`${nameSpace}.Seller`);
          const propertyListingRegistry = await getAssetRegistry(`${nameSpace}.PropertyListing`);
          const propertyRegistry = await getAssetRegistry(`${nameSpace}.Property`);

          //Verify that property exists
          const doesPropertyExist = await propertyRegistry.exists(tx.propertyID);
          if (!doesPropertyExist) {
               throw (`Property ${tx.propertyID} does not exist`);
          }

          //Verify that property listing exists
          const doesPropertyListingExist = await propertyListingRegistry.exists(tx.propertyListing.PLID);
          if (!doesPropertyListingExist) {
               throw (`Property Listing ${tx.propertyListing.PLID} does not exist`);
          }

          //Verify that buyer exists
          const doesBuyerExist = await buyerRegistry.exists(tx.buyer.buyerName);
          if (!doesBuyerExist) {
               throw (`Buyer ${tx.buyer.buyerName} does not exist`);
          }

          //Dummy function to validate buyer's financial data
          if (!validateFinancialData(tx.buyer)) {
               throw (`Buyer financial details are invalid`);
          }

          const property = await propertyRegistry.get(tx.propertyID);
          const propertyListing = await propertyListingRegistry.get(tx.propertyListing.PLID);
          const buyer = await buyerRegistry.get(tx.buyer.buyerName);
          const seller = await sellerRegistry.get(property.owner);

          //Verify that property is listed for sale
          if (!property.intentForSale ||
                    propertyListing.status != "IntentForSale") {
               throw (`Property ${tx.propertyID} is not listed for sale`);
          }

          //Verify that buyer has sufficient bank balance to buy the property
          if (property.marketPrice > buyer.buyerBankBalance) {
               throw ('Insufficient bank balance');
          }

          //Update the property owner
          property.owner = tx.buyer.buyerName;
          property.status = "Registered";

          //Update buyer and seller bank balance to simulate transfer of funds
          buyer.buyerBankBalance -= propertyListing.marketPrice;
          seller.sellerBankBalance += propertyListing.marketPrice;

          //Updating the state of assets and participants
          await propertyRegistry.update(property);
          await buyerRegistry.update(buyer);
          await sellerRegistry.update(seller);
          //Delete property listing after successful sale
          await propertyListingRegistry.remove(propertyListing);

          console.log(`Property ${tx.propertyID} updated with new owner ${tx.buyer.buyerName}`);
          return `Property ${tx.propertyID} updated with new owner ${tx.buyer.buyerName}`;

     } catch (e) {
          console.log(e);
          return e;
     }
}