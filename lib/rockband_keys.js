var HID     = require('node-hid'),
    _       = require('lodash'),
    events  = require('events');

var wiiDongleVendorId = 7085;
var wiiDongleProductId = 13104;

/**
 * Returns all connected RockBand Dongles.
 * @function
 * @extends events.EventEmitter
 */
function getAvailableDevices() {
    var devices = HID.devices();
    
    var validDevices = _.filter(devices, function(d) {
        return d.vendorId == wiiDongleVendorId && d.productId == wiiDongleProductId; 
    });

    return validDevices;
}

_.mixin({
    sum: function(obj) {
        if (!_.isArray(obj) || obj.length == 0) return 0;
        return _.reduce(obj, function(sum, n) {
            return sum += n;
        });
    }
});


/**
 * Creates a new RockBandKeyboard instance.
 * @constructor
 * @param {Device} device A node-hid device. Available via <code>rockband_keys.getAvailableDevices()</code>
 */
function RockBandKeyboard(device) {
    events.EventEmitter.call(this);

    this.hidDevice = new HID.HID(device.path);

    this.noteData = [];
    for (var i = 0; i < 25; i++) this.noteData[i] = false;
    
    this.dpadData = {};
    var dirs = { Left: 6, Right: 2, Up: 0, Down: 4 };
    _.each(dirs, function(v, k) { this.dpadData[k] = false }, this);

    this.buttonData = {};
    this.buttons = { 1: 1, A: 2, B: 4, 2: 8 };
    _.each(this.buttons, function(v, k) { this.buttonData[k] = false }, this);

    this.touchData = 0;
    this.touchButtonData = false;

    /**
     * @fires RockBandKeyboard#dpad
     * @fires RockBandKeyboard#event:button
     * @fires RockBandKeyboard#event:touchOn
     * @fires RockBandKeyboard#event:touchOff
     * @fires RockBandKeyboard#event:touchButton
     * @fires RockBandKeyboard#event:noteOn
     * @fires RockBandKeyboard#event:noteOff
    */
    function processData(data) {

        var dpad = data[2];
        _.each(dirs, function(dir, name) {
            var pressed = dpad == dir;
            if (this.dpadData[name] != pressed) {
                /**
                 * @event RockBandKeyboard#dpad
                 * @memberOf RockBandKeyboard
                 * @param {Object} data             Event data.
                 * @param {Boolean} data.pressed    Button pressed or not.
                 * @param {String} data.name        Which button was pressed ("Left", "Right", "Up", "Down").
                 */
                this.emit("dpad", { name: name, pressed: pressed });
                this.dpadData[name] = pressed;
            }
        }, this);

        var buttonsPressed = data[0];
        _.each(this.buttons, function(button, name) {
            var pressed = (buttonsPressed & button) != 0;
            if (this.buttonData[name] != pressed) {
                /**
                 * @event RockBandKeyboard#button
                 * @param {Object} data             Event data.
                 * @param {Boolean} data.pressed    Button pressed or not.
                 * @param {String} data.name        Which button was pressed ("1", "A", "B", "2").
                 */
                this.emit("button", {name: name, pressed: pressed });
                this.buttonData[name] = pressed;
            }
        }, this);
        
        var touch = data[15];
        if (this.touchData != touch) {
            /**
             * @event RockBandKeyboard#touchOn
             * @param {Object} data         Event data.
             * @param {Integer} data.value  The Touchpad-Value.
             */
            /**
             * @event RockBandKeyboard#touchOff
             */
            touch != 0 ? this.emit('touchOn', { value: touch }) : this.emit('touchOff');
            this.touchData = touch;
        }
        
        var touchButton = data[13] != 0;
        if (this.touchButtonData != touchButton) {
            /**
             * @event RockBandKeyboard#touchButton
             * @param {Object} data             Event data.
             * @param {Boolean} data.pressed    Whether the button is pressed or not.
             */
            this.emit('touchButton', {pressed: touchButton});
            this.touchButtonData = touchButton;
        }


        var note = 0;
        for (var i = 5; i <= 8; i++) {
            note += data[i] << (8 * (8 - i));
        }
        data[8] = data[8] & 0x7F;
        var velocityData = _.filter(data.slice(8, 13), function(v) { return v != 0; });
        for (var i = 0; i < 25; i++) {
            if (this.noteData[i] && velocityData.length) {
                this.noteData[i] = velocityData[0];
                velocityData = velocityData.slice(1);
            }

            var mask = 0x80000000 >>> i;
            var noteOn = (note & mask) != 0;
            if ((this.noteData[i] != 0) != noteOn) {
                var velocity = 0;
                if (noteOn) {
                    if (velocityData.length) {
                        velocity = velocityData[0];
                        velocityData = velocityData.slice(1);
                    }
                    else {
                        var curVelocities = _.chain(this.noteData).filter(function(v) { return v != 0; }).values();
                        velocity = (curVelocities.sum().value() / curVelocities.value().length) | 0;
                    }
                }
                /**
                 * @event RockBandKeyboard#noteOn
                 * @param {Object} data             Event data.
                 * @param {Integer} data.note       The note that was pressed (0...25)
                 * @param {Integer} data.velocity   The velocity of the pressed note.
                 */
                 /**
                 * @event RockBandKeyboard#noteOff
                 * @param {Object} data             Event data.
                 * @param {Integer} data.note       The note that was released (0...25)
                 * @param {Integer} data.noteData   Some really useful data.
                 */
                noteOn ? this.emit('noteOn', {note: i, velocity: velocity}) : this.emit('noteOff', { note: i });
                this.noteData[i] = velocity;
            }
        }
    };

    var onRead = _.bind(function(error, data) {
        if (error) throw error;
        processData.call(this, data);
        data = null;
        this.hidDevice.read(onRead);
    }, this);

    /**
     * Starts listening for inputs from the USB-Dongle.
     **/
    this.start = function() {
        this.hidDevice.read(onRead);
    };
    
    /**
     * Stops listening.
     **/
    this.close = function() {
        this.hidDevice.close();
    };

}
RockBandKeyboard.prototype.__proto__ = events.EventEmitter.prototype;


module.exports = RockBandKeyboard;
module.exports.getAvailableDevices = getAvailableDevices;