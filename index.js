'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === '***REMOVED***') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

// Check if an object has a property. See http://stackoverflow.com/questions/4676223/check-if-object-member-exists-in-nested-object
function objHas(obj, prop) {
    var parts = prop.split('.')
    for(var i = 0, l = parts.length; i < l; i++) {
        var part = parts[i]
        if(obj !== null && typeof obj === "object" && part in obj) {
            obj = obj[part]
        }
        else {
            return false
        }
    }
    return true;
}

function findInJSON(o, id) {
	var result;
	for (var i in o) {
  		if (o[i] instanceof Object) {
    		result = findInJSON(o[i], id);
    	}
    	if (result) {
    		return result;
    	}
    	else if (o[i] instanceof Array) {
    		for (var j in o[i]) {
      			result = findInJSON(j, id);
      		}
    	}
    	else {
    		//console.log(i);
      		if (i === id) {
      			result = o[i];
      		}
    	}
    }
    return result;
}

function numberOfThings(o) {
	var num = 0;
  for (i in o) {
    if (o[i] instanceof Object) {
      num += numberOfThings(o[i])
    }
    else if (o[i] instanceof Array) {
      for (j in o[i]) {
        num += numberOfThings(j)
      }
    }
    else {
      num += 1;
      console.log(o[i])
    }
  }
  return num;
}

app.post('/webhook/', function (req, res) {
	//console.log('Received: ', JSON.stringify(req))
	if (req.body.hasOwnProperty('object') && req.body['object'] === "page") {
	    let messaging_events = req.body.entry[0].messaging
	    for (let i = 0; i < messaging_events.length; i++) {
	        let event = req.body.entry[0].messaging[i]
	        let sender = event.sender.id
	        //console.log(JSON.stringify(event.message.attachments[0]))
	        let startLatitude = findInJSON(event, 'lat')
	        let startLongitude = findInJSON(event, 'long')
	        if (startLatitude && startLongitude) {
	            // let message = event.message
	            console.log('Message: ', JSON.stringify(event.message))            
	            // sendRandomRestaurant(sender, text)
	            sendTextMessage(sender, 'Latitude: ' + startLatitude + ', Longitude: ' + startLongitude)
	            getDirections(sender, startLatitude, startLongitude)
	        }
	        else {
	        	// sendTextMessage(sender, 'Please share your location')
	        	console.log('Error: ', 'Message from user is not a location')
	        }
	    }
	    res.sendStatus(200)
	}
})

const token = process.env.FB_PAGE_ACCESS_TOKEN
const yelpClientID = process.env.YELP_CLIENT_ID
const yelpClientSecret = process.env.YELP_CLIENT_SECRET
const googleKey = process.env.GOOGLE_DIRECTIONS_API_KEY

function getDirections(sender, startLat, startLong) {
	let destination = getRandomRestaurant(startLat, startLong)
	console.log('Destination: ', JSON.stringify(destination))
	// if (destination) {
	// 	console.log('Destination: ', JSON.stringify(destination).substring(0, 300))
	// 	let endLat = destination.coordinates.latitude
	// 	let endLong = destination.coordinates.longitude
	// 	let start = startLat + ', ' + startLong
	// 	let dest = endLong + ', ' + endLong
	// 	request({
	// 		url: 'https://maps.googleapis.com/maps/api/directions/json',
	// 		method: 'GET',
	// 		headers: {
	// 			'origin': start,
	// 			'destination': dest,
	// 			'mode': 'driving',
	// 			'key': googleKey
	// 		}
	// 	}, function(error, response, body) {
	// 		if (error) {
	// 			console.log('Error requesting directions from Google: ', error)
	// 		} else if (response.body.error) {
	// 			console.log('Error receiving directions from Google: ', response.body.error)
	// 		} else {
	// 			let googleResponse = JSON.parse(body)
	// 			let legs = googleResponse.routes[0].legs
	// 			console.log('Legs: ', JSON.stringify(legs))
	// 			sendTextMessage(sender, 'Got directions. See log for details.')
	// 		}
	// 	})
	// }
	// else {
	// 	console.log('Error: ', 'Error receiving random restaurant from Yelp.')
	// }
}

function getRandomRestaurant(startLat, startLong) {
	let yelpToken = ''
	let bearerText = ''
	request({
		url: 'https://api.yelp.com/oauth2/token',
		method: 'POST',
		form: {
			grant_type: 'client_credentials',
			client_id: yelpClientID,
			client_secret: yelpClientSecret
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error requesting access token from Yelp: ', error)
		} else if (response.body.error) {
			console.log('Error receiving access token from Yelp: ', response.body.error)
		} else {
			yelpToken = JSON.parse(body).access_token
			bearerText = 'Bearer ' + yelpToken
		}
	request({
		url: 'https://api.yelp.com/v3/businesses/search',
		headers: {'Authorization': bearerText},
		method: 'GET',
		qs: {'latitude': startLat, 'longitude': startLong}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending to Yelp: ', error)
		} else if (response.body.error) {
			console.log('Error received from Yelp: ', response.body.error)
		} else {
			let businessArray = JSON.parse(body).businesses
			let businessesLength = businessArray.length
			let low = 0
			let high = businessesLength
			let businessNumber = Math.floor(Math.random() * (high - low + 1) + low)
			console.log(businessArray[businessNumber].name)
			return businessArray[businessNumber]
			// sendTextMessage(sender, businessArray[businessNumber].name)
		}
	})
	})
}

// Send text message to user
function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

// // Send the name of a random restaurant to the user
// function sendRandomRestaurant(sender, city) {
// 	let yelpToken = ''
// 	let bearerText = ''
// 	request({
// 		url: 'https://api.yelp.com/oauth2/token',
// 		method: 'POST',
// 		form: {
// 			grant_type: 'client_credentials',
// 			client_id: yelpClientID,
// 			client_secret: yelpClientSecret
// 		}
// 	}, function(error, response, body) {
// 		if (error) {
// 			console.log('Error requesting access token from Yelp: ', error)
// 		} else if (response.body.error) {
// 			console.log('Error receiving access token from Yelp: ', response.body.error)
// 		} else {
// 			yelpToken = JSON.parse(body).access_token
// 			bearerText = 'Bearer ' + yelpToken
// 		}
// 	request({
// 		url: 'https://api.yelp.com/v3/businesses/search',
// 		headers: {'Authorization': bearerText},
// 		method: 'GET',
// 		qs: {location: city}
// 	}, function(error, response, body) {
// 		if (error) {
// 			console.log('Error sending to Yelp: ', error)
// 		} else if (response.body.error) {
// 			console.log('Error received from Yelp: ', response.body.error)
// 		} else {
// 			let businessArray = JSON.parse(body).businesses
// 			let businessesLength = businessArray.length
// 			let low = 0
// 			let high = businessesLength
// 			let businessNumber = Math.floor(Math.random() * (high - low + 1) + low)
// 			sendTextMessage(sender, businessArray[businessNumber].name)
// 		}
// 	})
// 	})
// }