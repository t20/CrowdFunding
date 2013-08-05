/*
 * GET home page.
 */

// Configuration
var MONGO_URI = "mongodb://localhost:27017/test";
var BALANCED_MARKETPLACE_URI = "/v1/marketplaces/TEST-YourMarketplaceURI";
var BALANCED_API_KEY = "YourAPIKey";
var CAMPAIGN_GOAL = 1000; // Your fundraising goal, in dollars

exports.index = function(req, res){
  Q.fcall(_getTotalFunds).then(function(total){
    res.render('index', { title: 'Express', 'total': total });
  });
};

exports.fund = function(req, res){
  res.render('fund', { title: 'Express' });
};

// check node convention for naming post handler functions
exports.fund_post = function(req, res){
  var card_uri = req.body.card_uri;
  var amount = req.body.amount;
  var name = req.body.name;

  console.log('Amount is ' + amount)
  console.log('Amount is ' + req.body.card_uri)

  Q.fcall(function(){

      // Create an account with the Card URI
      return _callBalanced("/accounts", {
          card_uri: card_uri
      });

  }).then(function(account){

      // Charge said account for the given amount
      return _callBalanced("/debits", {
          account_uri: account.uri,
          amount: Math.round(amount*100) // Convert from dollars to cents, as integer
      });

  }).then(function(transaction){

      // Donation data
      var donation = {
          name: name,
          amount: transaction.amount/100, // Convert back from cents to dollars.
          transaction: transaction
      };

    	// Record donation to database
    	return _recordDonation(donation);

  }).then(function(donation){

      // Personalized Thank You Page
      res.render('thanks', { 'name': name, 'amount': amount, 'extra': JSON.stringify(donation, null, 4) });

  },function(err){
      response.send("Error: "+err);
  });

};

// Calling the Balanced REST API
var Q = require('q');
var httpRequest = require('request');
function _callBalanced(url, params){

    // Promise an HTTP POST Request
    var deferred = Q.defer();
    httpRequest.post({

        url: "https://api.balancedpayments.com" + BALANCED_MARKETPLACE_URI + url,
        auth: {
            user: BALANCED_API_KEY,
            pass: "",
            sendImmediately: true
        },
        json: params

    }, function(error,response,body){

        // Handle all Bad Requests (Error 4XX) or Internal Server Errors (Error 5XX)
        console.log('Got status from _callBalanced:' + body.status_code)
        if(body.status_code >= 400){
            deferred.reject(body.description);
            return;
        }

        // Successful Requests
        deferred.resolve(body);

    });
    return deferred.promise;

}

// Recording a Donation
var mongo = require('mongodb').MongoClient;
function _recordDonation(donation){

    // Promise saving to database
    var deferred = Q.defer();
    mongo.connect(MONGO_URI,function(err,db){
        if(err){ return deferred.reject(err); }

        // Insert donation
        db.collection('donations').insert(donation,function(err){
            if(err){ return deferred.reject(err); }

            // Promise the donation you just saved
            deferred.resolve(donation);

            // Close database
            db.close();

        });
    });
    return deferred.promise;

}

// Get total donation funds
function _getTotalFunds(){

    // Promise the result from database
    var deferred = Q.defer();
    mongo.connect(MONGO_URI,function(err,db){
        if(err){ return deferred.reject(err); }

        // Get amounts of all donations
        db.collection('donations')
        .find( {}, {amount:1} ) // Select all, only return "amount" field
        .toArray(function(err,donations){
            if(err){ return deferred.reject(err); }

            // Sum up total amount, and resolve promise.
            var total = donations.reduce(function(previousValue,currentValue){
                return previousValue + currentValue.amount;
            },0);
            deferred.resolve(total);

            // Close database
            db.close();

        });
    });
    return deferred.promise;

}