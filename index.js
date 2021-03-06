'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const GoogleMapsAPI = require('googlemaps')
const htmlToText = require('html-to-text')

const token = process.env.FB_PAGE_ACCESS_TOKEN
const yelpClientID = process.env.YELP_CLIENT_ID
const yelpClientSecret = process.env.YELP_CLIENT_SECRET
const googleKey = process.env.GOOGLE_DIRECTIONS_API_KEY
const fbVerifyToken = process.env.FB_VERIFY_TOKEN

var publicGMConfig = {
	key: googleKey,
	secure: true
}

var gmAPI = new GoogleMapsAPI(publicGMConfig)

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
    if (req.query['hub.verify_token'] === 'fbVerifyToken') {
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
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        let startLatitude = findInJSON(event, 'lat')
        let startLongitude = findInJSON(event, 'long')
        if (startLatitude && startLongitude) {
            sendTextMessage(sender, 'Latitude: ' + startLatitude + ', Longitude: ' + startLongitude)
            getDirections(sender, startLatitude, startLongitude)
        }
        else {
        	// sendTextMessage(sender, 'Please share your location')
        	//console.log('Error: ', 'Message from user is not a location')
        }
    }
    res.sendStatus(200)
})

function getDirections(sender, startLat, startLong) {
	var yelpToken = ''
	var bearerText = ''
	var businessName = ''
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
			var businessName = businessArray[businessNumber].name
			// console.log(businessArray[businessNumber].name)

			let destLat = businessArray[businessNumber].coordinates.latitude
			let destLong = businessArray[businessNumber].coordinates.longitude

			sendTextMessage(sender, 'Destination: ' + businessName + ' ' + destLat + ', ' + destLong)

			let start = startLat + ',' + startLong
			let dest = destLat + ',' + destLong

			// console.log('Start: ', start)
			// console.log('Dest: ', dest)

			var directionsParams = {
				origin: start,
				destination: dest,
				mode: 'driving'
			}

			gmAPI.directions(directionsParams, function(err, response) {
				if (err) {
					console.log('Error requesting directions from Google: ', err)
				} else if (response.error) {
					console.log('Error receiving directions from Google: ', response.error)
				} else {
					console.log('Successfully received directions from Google')
					// console.log(JSON.stringify(response.routes[0].legs[0].steps))
					// TODO: Send the legs to the user
					var routeSteps = response.routes[0].legs[0].steps
					// for (var i = 0; i < routeSteps.length; i++) {
					// 	// console.log(JSON.stringify(routeSteps[i].html_instructions))
					// 	sendTextMessage(sender, routeSteps[i].html_instructions)
					// }

                    // TODO: Store the trip in a Postgres table
                    // Store steps of the trip trip as an array of strings (directions)
                    // Store the step the user is on
                    // The step can come in a rich message, with a postback button for 'Next step'
                    // When the user taps 'Next step,' dinnerbot can send them the next step and update Postgres
                    // We can store a timestamp when the trip was created and create a new trip if it's been a while (an hour?)
                    // Or we can add a button for 'New trip'
                    // Or we can just start a new trip when the user sends their location
                    var routeInstructions = []
                    for (var i = 0; i < routeSteps.length - 1; i++) {
                        routeInstructions.push(routeSteps[i].html_instructions)
                    }
                    var lastTwoMessages = splitLastMessage(routeSteps[routeSteps.length - 1].html_instructions)
                    routeInstructions.push(lastTwoMessages[0])
                    routeInstructions.push(lastTwoMessages[1])
                    sendMessagesInOrder(sender, routeInstructions, 1)
				}
			})
		}
	})
	})
}

function splitLastMessage(message) {
    // indexToSplit = message.indexOf('Destination')
    console.log(message)
    var stringArray = message.split('Destination')
    if (stringArray.length > 1) {
        var firstMessage = stringArray[0]
        var secondMessage = 'Destination' + stringArray[1]
    }
    return [firstMessage, secondMessage]
}

// Send text message to user
function sendTextMessage(sender, text) {
    var textToSend = htmlToText.fromString(text, {
    	wordwrap: false
	})
	console.log(textToSend)
	let messageData = { text:textToSend }
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

function sendMessagesInOrder(sender, messages, i) {
    // TODO: Clean this up. This creates a copy of the messages array each time, unnecessarily using space
    var msg = messages[i-1]
    var textToSend = htmlToText.fromString(msg, {
        wordwrap: false
    })
    console.log(textToSend)
    let messageData = { text:textToSend }
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
        else if (i < messages.length) {
            i += 1
            sendMessagesInOrder(sender, messages, i)
        }
        else if (i == messages.length) {
            sendTextMessage(sender, 'Bon appetit!')
        }
    })
}