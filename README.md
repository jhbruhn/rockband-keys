# Rockband-Keys
This is an interface for the RockBand Keyboard for Wii. All you have to do is plug the dongle into an USB-Port and start using this library.

## Example:
```javascript

var RockBandKeys = require('rockband-keys');

var connectedDongles = RockBandKeys.getAvailableDevices(); // Get the connected Dongles

var keyboard = new RockBandKeys(connectedDongles[0]); // Make a new Keyboard instance.

// and listen for all the events:
keyboard.on("dpad", function(data) {
	console.log("DPad " + data.name + " was " + (data.pressed ? "pressed." : "released."));
});
keyboard.on("button", function(data) {
	console.log("Button " + data.name + " was " + (data.pressed ? "pressed." : "released."));
});
keyboard.on("touchOn", function(data) {
	console.log("The Touch-Controller was pressed at " + data.value + ".");
});
keyboard.on("touchOff", function(data) {
	console.log("The Touch-Controller was released.");
});
keyboard.on("touchButton", function(data) {
	console.log("The Touch-Button was " + (data.pressed ? "pressed." : "released."));
});
keyboard.on("noteOn", function(data) {
	console.log("The Note " + data.note + " was pressed with a velocity of " + data.velocity + ".");
});
keyboard.on("noteOff", function(data) {
	console.log("The Note " + data.note + " was released.");
});

// start listening for input
keyboard.start();
...
// stop listening for input
keyboard.close();

```